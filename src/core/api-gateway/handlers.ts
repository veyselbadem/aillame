import type { AillameRequest } from "../contracts/aillame-request";
import { runDiagnosticWorkflowReadOnly } from "../agent/workflow/diagnostic-workflow";
import type { AillameDiagnosticWorkflowInput, AillameDiagnosticWorkflowResult } from "../agent/workflow/agent-workflow-types";
import { decideAillameHybrid, type AillameHybridDecisionResult } from "../decision/hybrid-decision-engine";
import { generateWithBestTextRuntime } from "../runtime/text/text-runtime-router";
import type { AillameTextGenerateResult } from "../runtime/text/text-runtime-types";
import { buildModelRuntimeStatusView, type AillameModelsRuntimeStatusView } from "../models/model-runtime-status";
import { getModelById, listModels } from "../models/registry";
import { isTextRuntimeRouterCompatible } from "../models/model-availability-guard";
import { authorizeAillameRequest } from "./auth";
import { getRuntimeStatus } from "./runtime-status";
import type { AillameApiErrorBody, AillameApiRequest, AillameApiResponse } from "./types";
import { validateAillameRequest, type ValidationResult } from "./validation";
import {
  buildApiDiagnosticsEnvelope,
  createSuccessDiagnostic,
  type AillameApiDiagnosticsEnvelope,
} from "./api-diagnostics";

type ModelsResponse = {
  success: true;
  models: ReturnType<typeof listModels>;
  count: number;
  modelRuntimeStatus: AillameModelsRuntimeStatusView["models"];
  runtimeOnly: AillameModelsRuntimeStatusView["runtimeOnly"];
  runtimeSummary: AillameModelsRuntimeStatusView["summary"];
  diagnostics?: AillameApiDiagnosticsEnvelope;
};

type GenerateResponse = {
  success: true;
  status: "generated" | "routed";
  message: string;
  projectId?: string;
  request: {
    prompt: string;
    taskType?: string;
    contentType?: string;
    outputType?: string;
    preferredModelId?: string;
  };
  routing: AillameHybridDecisionResult["routingDecision"];
  decision: AillameHybridDecisionResult["finalDecision"];
  decisionSources: AillameHybridDecisionResult["sources"];
  decisionDiagnostics: AillameHybridDecisionResult["diagnostics"];
  model?: ReturnType<typeof getModelById>;
  output?: {
    content: string;
    runtime: string;
    usedLocalEngine: boolean;
    usedModelIds: string[];
    warnings: string[];
    debug?: AillameTextGenerateResult["diagnostics"];
  };
  diagnostics?: AillameApiDiagnosticsEnvelope;
};

type DiagnosticResponse = {
  success: true;
  workflow: AillameDiagnosticWorkflowResult;
  diagnostics?: AillameApiDiagnosticsEnvelope;
};

function jsonResponse<TBody>(statusCode: number, body: TBody): AillameApiResponse<TBody> {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body,
  };
}

function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: string
): AillameApiResponse<AillameApiErrorBody> {
  const isValidation = statusCode === 400 || code.includes("VALIDATION") || code.includes("INVALID");
  
  return jsonResponse(statusCode, {
    success: false,
    error: {
      code,
      message,
      details,
    },
    diagnostics: buildApiDiagnosticsEnvelope([
      {
        code: isValidation ? "VALIDATION_ERROR" : "UNKNOWN_ERROR",
        severity: "error",
        message: `${code}: ${message}`,
      },
    ]),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function withEndpointDefaults(request: AillameRequest, path: string): AillameRequest {
  if (path === "/api/aillame/chat") {
    return {
      ...request,
      taskType: request.taskType ?? "chat",
      contentType: request.contentType ?? "text",
      outputType: request.outputType ?? "text",
    };
  }

  if (path === "/api/aillame/image") {
    return {
      ...request,
      taskType: request.taskType ?? "image",
      contentType: request.contentType ?? "text",
      outputType: request.outputType ?? "image",
    };
  }

  if (path === "/api/aillame/agent") {
    return {
      ...request,
      taskType: request.taskType ?? "agent",
      contentType: request.contentType ?? "project",
      outputType: request.outputType ?? "report",
    };
  }

  return request;
}

function handleModels(): AillameApiResponse<ModelsResponse> {
  const models = listModels();
  const runtimeStatus = buildModelRuntimeStatusView(models);
  return jsonResponse(200, {
    success: true,
    models,
    count: models.length,
    modelRuntimeStatus: runtimeStatus.models,
    runtimeOnly: runtimeStatus.runtimeOnly,
    runtimeSummary: runtimeStatus.summary,
    diagnostics: buildApiDiagnosticsEnvelope([createSuccessDiagnostic("Models and runtime status retrieved.")]),
  });
}

async function handleGenerate(
  request: AillameApiRequest,
  projectIdFromAuth?: string
): Promise<AillameApiResponse<GenerateResponse | AillameApiErrorBody>> {
  const validation = validateAillameRequest(request.body);
  if (!validation.ok) {
    return errorResponse(400, validation.code, validation.message, validation.details);
  }

  const gatewayRequest = withEndpointDefaults(validation.value, request.path);
  const projectId = gatewayRequest.projectId ?? projectIdFromAuth;
  const hybridDecision = await decideAillameHybrid({
    prompt: gatewayRequest.prompt,
    taskType: gatewayRequest.taskType,
    contentType: gatewayRequest.contentType,
    outputType: gatewayRequest.outputType,
    preferredModelId: gatewayRequest.preferredModelId,
    projectId,
    mode: gatewayRequest.mode,
    metadata: gatewayRequest.metadata,
  });
  const model = hybridDecision.finalDecision.selectedModelId ? getModelById(hybridDecision.finalDecision.selectedModelId) : undefined;
  const canTryTextRuntime = (
    isTextRuntimeRouterCompatible(model)
    && hybridDecision.routingDecision.outputType === "text"
    && !hybridDecision.routingDecision.capabilities.includes("image-generation")
    && !hybridDecision.routingDecision.capabilities.includes("agent-task")
  );

  if (canTryTextRuntime) {
    const runtimeResult = await generateWithBestTextRuntime({
      modelId: model?.id ?? hybridDecision.finalDecision.selectedModelId ?? "unknown",
      projectId,
      mode: gatewayRequest.mode,
      taskType: hybridDecision.routingDecision.taskType,
      prompt: gatewayRequest.prompt,
      messages: gatewayRequest.messages,
      maxTokens: typeof gatewayRequest.metadata?.maxTokens === "number" ? gatewayRequest.metadata.maxTokens : undefined,
      temperature: typeof gatewayRequest.metadata?.temperature === "number" ? gatewayRequest.metadata.temperature : undefined,
      stream: gatewayRequest.metadata?.stream === true,
      metadata: gatewayRequest.metadata,
    });

    return jsonResponse(200, {
      success: true,
      status: runtimeResult.generation.success ? "generated" : "routed",
      message: runtimeResult.generation.success
        ? runtimeResult.generation.usedLocalRuntime
          ? "Request validated, routed, and generated with Aillame text runtime router."
          : "Request validated and routed. Aillame text runtime router returned a degraded response."
        : "Request validated and routed. No compatible Aillame text runtime could generate this request.",
      projectId,
      request: {
        prompt: gatewayRequest.prompt,
        taskType: gatewayRequest.taskType,
        contentType: gatewayRequest.contentType,
        outputType: gatewayRequest.outputType,
        preferredModelId: gatewayRequest.preferredModelId,
      },
      routing: hybridDecision.routingDecision,
      decision: hybridDecision.finalDecision,
      decisionSources: hybridDecision.sources,
      decisionDiagnostics: hybridDecision.diagnostics,
      model,
      output: {
        content: runtimeResult.generation.content,
        runtime: runtimeResult.generation.modelId === "aillame-nano" ? "aillame-nano" : runtimeResult.generation.runtimeKind,
        usedLocalEngine: runtimeResult.generation.usedLocalRuntime,
        usedModelIds: [runtimeResult.generation.modelId],
        warnings: [...runtimeResult.route.warnings, ...runtimeResult.generation.warnings],
        debug: runtimeResult.generation.diagnostics,
      },
      diagnostics: buildApiDiagnosticsEnvelope([
        runtimeResult.generation.success
          ? createSuccessDiagnostic(runtimeResult.generation.usedLocalRuntime ? "Inference completed on local runtime." : "Inference completed (degraded mode).")
          : {
              code: "TEXT_RUNTIME_UNAVAILABLE",
              severity: "warning",
              message: "No compatible text runtime could fulfill the generation request.",
            },
        ...(runtimeResult.generation.degraded ? [{ code: "TEXT_RUNTIME_DEGRADED" as const, severity: "warning" as const, message: "Runtime returned a degraded response." }] : []),
      ]),
    });
  }

  return jsonResponse(200, {
    success: true,
    status: "routed",
    message: "Request validated and routed. Inference is only enabled for safe text/chat/analysis tasks on the Aillame Rust runtime in this phase.",
    projectId,
    request: {
      prompt: gatewayRequest.prompt,
      taskType: gatewayRequest.taskType,
      contentType: gatewayRequest.contentType,
      outputType: gatewayRequest.outputType,
      preferredModelId: gatewayRequest.preferredModelId,
    },
    routing: hybridDecision.routingDecision,
    decision: hybridDecision.finalDecision,
    decisionSources: hybridDecision.sources,
    decisionDiagnostics: hybridDecision.diagnostics,
    model,
    diagnostics: buildApiDiagnosticsEnvelope([
      {
        code: "ROUTED_ONLY",
        severity: "info",
        message: "Request was successfully routed but not executed (non-text task or blocked runtime).",
      },
    ]),
  });
}

function validateDiagnosticWorkflowRequest(body: unknown): ValidationResult<AillameDiagnosticWorkflowInput> {
  if (!isRecord(body)) {
    return {
      ok: false,
      code: "INVALID_JSON_BODY",
      message: "Request body must be a JSON object.",
    };
  }

  const userMessage = optionalString(body.userMessage);
  const logText = optionalString(body.logText);
  const command = optionalString(body.command);
  const rootPath = optionalString(body.rootPath);

  if (!userMessage && !logText && !command && !rootPath) {
    return {
      ok: false,
      code: "INVALID_DIAGNOSTIC_INPUT",
      message: "At least one of rootPath, userMessage, logText, or command is required.",
    };
  }

  if ((logText?.length ?? 0) > 200000) {
    return {
      ok: false,
      code: "LOG_TOO_LONG",
      message: "logText must be 200000 characters or fewer.",
    };
  }

  return {
    ok: true,
    value: {
      projectId: optionalString(body.projectId),
      rootPath,
      userMessage,
      logText,
      command,
      includeWorkspaceScan: optionalBoolean(body.includeWorkspaceScan),
      includeMemoryRecall: optionalBoolean(body.includeMemoryRecall),
      includePatchPlan: optionalBoolean(body.includePatchPlan),
      includeCommandPlan: optionalBoolean(body.includeCommandPlan),
      metadata: isRecord(body.metadata) ? body.metadata : undefined,
    },
  };
}

function handleDiagnosticWorkflow(
  request: AillameApiRequest,
  projectIdFromAuth?: string
): AillameApiResponse<DiagnosticResponse | AillameApiErrorBody> {
  const validation = validateDiagnosticWorkflowRequest(request.body);
  if (!validation.ok) {
    return errorResponse(400, validation.code, validation.message, validation.details);
  }

  const workflow = runDiagnosticWorkflowReadOnly({
    ...validation.value,
    projectId: validation.value.projectId ?? projectIdFromAuth,
  });

  return jsonResponse(200, {
    success: true,
    workflow,
    diagnostics: buildApiDiagnosticsEnvelope([createSuccessDiagnostic("Diagnostic workflow completed.")]),
  });
}

export async function handleAillameApiRequest(request: AillameApiRequest): Promise<AillameApiResponse> {
  const method = request.method.toLocaleUpperCase("en-US");
  const path = request.path.replace(/\/$/, "");

  if (!path.startsWith("/api/aillame")) {
    return errorResponse(404, "NOT_FOUND", "Endpoint not found.");
  }

  const auth = authorizeAillameRequest(request.headers);

  if (!auth.ok) {
    return errorResponse(auth.statusCode, auth.code, auth.message);
  }

  if (method === "GET" && path === "/api/aillame/models") {
    return handleModels();
  }

  if (method === "GET" && path === "/api/aillame/runtime/status") {
    return jsonResponse(200, getRuntimeStatus());
  }

  if (
    method === "POST"
    && (
      path === "/api/aillame/generate"
      || path === "/api/aillame/chat"
      || path === "/api/aillame/image"
      || path === "/api/aillame/agent"
    )
  ) {
    return handleGenerate({ ...request, path }, auth.projectId);
  }

  if (method === "POST" && path === "/api/aillame/diagnostic") {
    return handleDiagnosticWorkflow({ ...request, path }, auth.projectId);
  }

  return errorResponse(404, "AILLAME_ENDPOINT_NOT_FOUND", "Aillame API endpoint not found.");
}
