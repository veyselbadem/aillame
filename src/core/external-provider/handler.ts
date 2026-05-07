import { getRuntimeStatus } from "@core/api-gateway/runtime-status";
import type { AillameApiHeaders } from "@core/api-gateway/types";
import type { AillameTaskType } from "@core/contracts/aillame-request";
import { getDefaultProjectMemoryStore } from "@core/memory/project-memory-store";
import { listProjectPresets, normalizeCoreMode, normalizeProjectIdentity } from "@core/projects/project-identity";
import { generateWithBestTextRuntime } from "@core/runtime/text/text-runtime-router";
import { createCodeAgentTask } from "@core/agent/code-agent/code-agent-service";
import { authorizeExternalProviderRequest } from "./external-auth";
import type { ExternalChatData, ExternalProviderError, ExternalProviderSuccess, ExternalTaskData } from "./types";

export type ExternalProviderHttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: ExternalProviderSuccess | ExternalProviderError;
};

function json(statusCode: number, body: ExternalProviderHttpResponse["body"]): ExternalProviderHttpResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body,
  };
}

function requestIdFromBody(body: unknown): string {
  if (body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).requestId === "string") {
    return (body as Record<string, string>).requestId;
  }
  return `req_${Date.now().toString(36)}`;
}

function error(statusCode: number, requestId: string, code: string, message: string, details?: Record<string, unknown>): ExternalProviderHttpResponse {
  return json(statusCode, { success: false, requestId, error: { code, message, details } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function taskTypeForRuntime(value: string | undefined): AillameTaskType {
  if (value === "code" || value === "analysis" || value === "agent" || value === "image" || value === "vision" || value === "mixed") return value;
  if (value === "market-analysis") return "analysis";
  return "chat";
}

function identityFromBody(body: Record<string, unknown>, projectIdOverride?: string) {
  return normalizeProjectIdentity({
    ...body,
    projectId: projectIdOverride ?? body.projectId,
  });
}

export async function handleExternalProviderChat(input: {
  headers?: AillameApiHeaders;
  body: unknown;
  projectIdOverride?: string;
}): Promise<ExternalProviderHttpResponse> {
  const requestId = requestIdFromBody(input.body);
  const auth = authorizeExternalProviderRequest(input.headers);
  if (!auth.ok) return error(auth.statusCode, requestId, auth.code, auth.message);

  if (!isRecord(input.body)) return error(400, requestId, "INVALID_JSON_BODY", "Request body must be a JSON object.");
  const identityResult = identityFromBody(input.body, input.projectIdOverride);
  if (!identityResult.ok) return error(400, requestId, identityResult.code, identityResult.message, identityResult.details);

  const message = stringValue(input.body.message) ?? stringValue(input.body.prompt);
  if (!message) return error(400, identityResult.identity.requestId, "INVALID_MESSAGE", "message or prompt is required.");

  const memory = getDefaultProjectMemoryStore();
  const recalled = identityResult.identity.memoryScope === "none"
    ? undefined
    : memory.read({
        identity: identityResult.identity,
        query: message,
        includeGlobal: input.body.includeGlobalMemory === true,
      });

  const memoryContext = recalled?.entries.length
    ? `\n\nProject memory:\n${recalled.entries.map((entry) => `- ${entry.content}`).join("\n")}`
    : "";

  const runtime = await generateWithBestTextRuntime({
    projectId: identityResult.identity.projectId,
    mode: normalizeCoreMode(identityResult.identity.mode),
    taskType: taskTypeForRuntime(identityResult.identity.taskType),
    prompt: `${message}${memoryContext}`,
    maxTokens: typeof input.body.maxTokens === "number" ? input.body.maxTokens : undefined,
    temperature: typeof input.body.temperature === "number" ? input.body.temperature : undefined,
    metadata: {
      requestId: identityResult.identity.requestId,
      sourceApp: identityResult.identity.sourceApp,
      responseFormat: identityResult.identity.responseFormat,
    },
  });

  const shouldWriteMemory = input.body.writeMemory === true && identityResult.identity.memoryScope !== "none";
  const writeResult = shouldWriteMemory
    ? memory.write({
        identity: identityResult.identity,
        topic: typeof input.body.memoryTopic === "string" ? input.body.memoryTopic : "external-chat",
        content: message,
        tags: ["external-provider", identityResult.identity.sourceApp ?? identityResult.identity.projectId],
      })
    : undefined;

  const data: ExternalChatData = {
    message,
    content: runtime.generation.content,
    runtime: runtime.generation.runtimeKind,
    usedLocalRuntime: runtime.generation.usedLocalRuntime,
    degraded: runtime.generation.degraded,
    warnings: [...runtime.route.warnings, ...runtime.generation.warnings, ...(writeResult?.warnings ?? [])],
    memory: {
      recalled: recalled?.entries.length ?? 0,
      written: writeResult?.success === true,
    },
  };

  return json(runtime.generation.success ? 200 : 503, {
    success: true,
    requestId: identityResult.identity.requestId,
    projectId: identityResult.identity.projectId,
    mode: identityResult.identity.mode,
    data,
    diagnostics: {
      auth: auth.mode,
      preset: identityResult.preset.label,
      route: runtime.route.reason,
      runtimeDiagnostics: runtime.generation.diagnostics,
      memoryDiagnostics: recalled?.diagnostics,
    },
  });
}

export function handleExternalProviderTask(input: {
  headers?: AillameApiHeaders;
  body: unknown;
}): ExternalProviderHttpResponse {
  const requestId = requestIdFromBody(input.body);
  const auth = authorizeExternalProviderRequest(input.headers);
  if (!auth.ok) return error(auth.statusCode, requestId, auth.code, auth.message);
  if (!isRecord(input.body)) return error(400, requestId, "INVALID_JSON_BODY", "Request body must be a JSON object.");

  const identityResult = identityFromBody(input.body);
  if (!identityResult.ok) return error(400, requestId, identityResult.code, identityResult.message, identityResult.details);

  const data: ExternalTaskData = {
    accepted: true,
    identity: identityResult.identity,
    route: {
      taskType: identityResult.identity.taskType,
      requiredCapabilities: identityResult.identity.requiredCapabilities,
    },
  };
  const codeAgent = identityResult.identity.taskType === "code-agent"
    || identityResult.identity.taskType === "project-scan"
    || input.body.agentType === "code-agent"
    ? createCodeAgentTask({
        projectId: identityResult.identity.projectId,
        mode: identityResult.identity.mode,
        sourceApp: identityResult.identity.sourceApp,
        userRequest: typeof input.body.message === "string" ? input.body.message : "Plan code agent task",
        taskType: identityResult.identity.taskType === "project-scan" ? "project-scan" : "analyze",
        targetFiles: Array.isArray(input.body.targetFiles) ? input.body.targetFiles.filter((item): item is string => typeof item === "string") : undefined,
      })
    : undefined;

  return json(202, {
    success: true,
    requestId: identityResult.identity.requestId,
    projectId: identityResult.identity.projectId,
    mode: identityResult.identity.mode,
    data: {
      ...data,
      codeAgent,
    },
    diagnostics: { auth: auth.mode, note: "Task queue execution is not enabled in this phase; Code Agent responses are plan-only." },
  });
}

export function handleExternalProviderRuntimeStatus(headers?: AillameApiHeaders): ExternalProviderHttpResponse {
  const requestId = `req_${Date.now().toString(36)}`;
  const auth = authorizeExternalProviderRequest(headers);
  if (!auth.ok) return error(auth.statusCode, requestId, auth.code, auth.message);
  return json(200, {
    success: true,
    requestId,
    projectId: "general",
    mode: "general",
    data: getRuntimeStatus(),
    diagnostics: { auth: auth.mode },
  });
}

export function handleExternalProviderProjects(headers?: AillameApiHeaders): ExternalProviderHttpResponse {
  const requestId = `req_${Date.now().toString(36)}`;
  const auth = authorizeExternalProviderRequest(headers);
  if (!auth.ok) return error(auth.statusCode, requestId, auth.code, auth.message);
  return json(200, {
    success: true,
    requestId,
    projectId: "general",
    mode: "general",
    data: { projects: listProjectPresets() },
    diagnostics: { auth: auth.mode },
  });
}
