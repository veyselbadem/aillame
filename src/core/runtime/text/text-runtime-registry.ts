import { routeAillameRequest } from "../../aillame-router/router";
import type { AillameMode } from "../../aillame-router/types";
import type { AillameRoutingDecision } from "../../contracts/aillame-request";
import { generateWithAillameTextRuntime } from "../../model-adapters/aillame-text-runtime-adapter";
import { AILLAME_NANO_MODEL_ID, listModels } from "../../models/registry";
import { getNanoRustTextRuntimeHealth, getPlaceholderTextRuntimeHealth } from "./text-runtime-health";
import { createAillameManagedTextWorkerRuntime } from "./worker/text-worker-runtime";
import { createGgufWorkerRuntime } from "./worker/gguf/gguf-worker-runtime";
import type { AillameTextRuntime } from "./text-runtime-interface";
import type {
  AillameTextGenerateRequest,
  AillameTextGenerateResult,
  AillameTextRuntimeCapability,
  AillameTextRuntimeModelInfo,
} from "./text-runtime-types";

function promptFromRequest(request: AillameTextGenerateRequest): string {
  if (request.prompt?.trim()) return request.prompt;
  return (request.messages ?? []).map((message) => `${message.role}: ${message.content}`).join("\n");
}

function toAillameMode(value: string | undefined): AillameMode | undefined {
  if (value === "general" || value === "education" || value === "code" || value === "economy") return value;
  return undefined;
}

function hasCapabilities(
  model: AillameTextRuntimeModelInfo,
  capabilities: readonly AillameTextRuntimeCapability[] = []
): boolean {
  return capabilities.every((capability) => model.capabilities.includes(capability));
}

function buildRoutingDecision(
  request: AillameTextGenerateRequest,
  model: AillameTextRuntimeModelInfo
): AillameRoutingDecision {
  const prompt = promptFromRequest(request);
  const routed = routeAillameRequest({
    prompt,
    projectId: request.projectId,
    preferredModelId: request.modelId,
    taskType: request.taskType === "chat" || request.taskType === "text" || request.taskType === "analysis"
      ? request.taskType
      : undefined,
    contentType: "text",
    outputType: "text",
  });

  return {
    ...routed.routingDecision,
    selectedModelId: model.id,
    capabilities: routed.routingDecision.capabilities.filter((capability) => (
      capability === "chat" || capability === "text-generation" || capability === "analysis"
    )),
  };
}

const nanoRustRuntimeModel: AillameTextRuntimeModelInfo = {
  id: AILLAME_NANO_MODEL_ID,
  label: "Aillame Nano Rust Text Runtime",
  runtimeKind: "nano-rust",
  status: "unknown",
  capabilities: ["chat", "completion", "text-generation", "analysis", "decision"],
  contextWindow: listModels().find((model) => model.id === AILLAME_NANO_MODEL_ID)?.contextSize,
  maxOutputTokens: 2048,
  supportsStreaming: false,
  supportsSystemPrompt: true,
  supportsTools: false,
  notes: [
    "Wraps the existing Aillame Nano/Rust local text path.",
    "Streaming is part of the interface contract but is not enabled for this runtime yet.",
  ],
};

const nanoRustRuntime: AillameTextRuntime = {
  model: nanoRustRuntimeModel,
  canHandle(request, capabilities = []) {
    if (request.stream) return false;
    if (!hasCapabilities(this.model, capabilities)) return false;
    const taskType = request.taskType ?? "text";
    return taskType === "chat" || taskType === "text" || taskType === "analysis" || taskType === "decision";
  },
  getHealth() {
    return getNanoRustTextRuntimeHealth(this.model);
  },
  async generate(request): Promise<AillameTextGenerateResult> {
    const prompt = promptFromRequest(request);
    if (!prompt.trim()) {
      return {
        success: false,
        modelId: this.model.id,
        runtimeKind: this.model.runtimeKind,
        content: "",
        finishReason: "error",
        usedLocalRuntime: false,
        degraded: true,
        warnings: ["Text runtime request requires prompt or messages."],
        error: {
          code: "EMPTY_TEXT_RUNTIME_PROMPT",
          message: "prompt or messages must contain text.",
        },
      };
    }

    if (request.stream) {
      return {
        success: false,
        modelId: this.model.id,
        runtimeKind: this.model.runtimeKind,
        content: "",
        finishReason: "unsupported",
        usedLocalRuntime: false,
        degraded: true,
        warnings: ["Streaming is not supported by the Nano/Rust text runtime yet."],
        error: {
          code: "TEXT_RUNTIME_STREAMING_UNSUPPORTED",
          message: "This runtime cannot stream responses in the current phase.",
        },
      };
    }

    const routingDecision = buildRoutingDecision(request, this.model);
    const result = await generateWithAillameTextRuntime({
      prompt,
      projectId: request.projectId,
      mode: toAillameMode(request.mode),
      taskType: routingDecision.taskType,
      contentType: "text",
      outputType: "text",
      preferredModelId: this.model.id,
      metadata: {
        ...request.metadata,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      },
    }, routingDecision);

    return {
      success: true,
      modelId: this.model.id,
      runtimeKind: this.model.runtimeKind,
      content: result.content,
      finishReason: result.metadata.engineDebug?.cleanupReason === "MAX_TOKENS_REACHED" ? "length" : "stop",
      usedLocalRuntime: result.usedLocalEngine,
      degraded: !result.usedLocalEngine,
      warnings: result.warnings,
      diagnostics: {
        reasonCode: result.metadata.engineDebug?.reason ?? result.metadata.engineDebug?.cleanupReason,
        rawPreview: result.content.slice(0, 160),
        tokenCount: result.metadata.engineDebug?.generatedTokenCount,
        runtimeStatus: result.usedLocalEngine ? "available" : "degraded",
      },
    };
  },
};

const TEXT_RUNTIMES: readonly AillameTextRuntime[] = [
  nanoRustRuntime,
  createAillameManagedTextWorkerRuntime(),
  createGgufWorkerRuntime(),
];

export function listTextRuntimes(): AillameTextRuntimeModelInfo[] {
  return TEXT_RUNTIMES.map((runtime) => ({ ...runtime.model, capabilities: [...runtime.model.capabilities] }));
}

export function listTextRuntimeInstances(): AillameTextRuntime[] {
  return [...TEXT_RUNTIMES];
}

export function getTextRuntimeByModelId(modelId: string): AillameTextRuntime | undefined {
  return TEXT_RUNTIMES.find((runtime) => runtime.model.id === modelId);
}

export function findTextRuntimesByCapability(
  capability: AillameTextRuntimeCapability
): AillameTextRuntime[] {
  return TEXT_RUNTIMES.filter((runtime) => runtime.model.capabilities.includes(capability));
}
