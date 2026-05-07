import { getPlaceholderTextRuntimeHealth } from "../text-runtime-health";
import type { AillameTextRuntime } from "../text-runtime-interface";
import type { AillameTextGenerateResult, AillameTextRuntimeModelInfo } from "../text-runtime-types";
import { getAillameTextWorkerConfig } from "./text-worker-config";
import { createTextWorkerLifecycleState } from "./text-worker-lifecycle";
import { getTextWorkerHealth } from "./text-worker-health";
import type { AillameTextWorkerGenerateRequest, AillameTextWorkerGenerateResult } from "./text-worker-types";

export function generateWithAillameTextWorkerPlaceholder(
  _request: AillameTextWorkerGenerateRequest
): AillameTextWorkerGenerateResult {
  return {
    success: false,
    content: "",
    finishReason: "unsupported",
    degraded: true,
    warnings: ["Aillame-managed text worker generation is not implemented in this phase."],
    error: {
      code: "TEXT_WORKER_GENERATION_NOT_IMPLEMENTED",
      message: "Aillame-managed text worker skeleton cannot generate yet.",
    },
  };
}

export function createAillameManagedTextWorkerRuntime(): AillameTextRuntime {
  const config = getAillameTextWorkerConfig();
  const model: AillameTextRuntimeModelInfo = {
    id: config.modelId,
    label: config.label,
    runtimeKind: "aillame-managed-worker",
    status: config.enabled ? "unknown" : "disabled",
    capabilities: config.capabilities as AillameTextRuntimeModelInfo["capabilities"],
    supportsStreaming: config.supportsStreaming,
    supportsSystemPrompt: true,
    supportsTools: false,
    notes: config.notes,
  };

  return {
    model,
    canHandle() {
      return false;
    },
    getHealth() {
      const health = getTextWorkerHealth(createTextWorkerLifecycleState(config));
      if (!config.enabled) return getPlaceholderTextRuntimeHealth(model);
      return {
        modelId: model.id,
        runtimeKind: model.runtimeKind,
        status: health.status === "running" ? "available" : health.status === "disabled" ? "disabled" : "unavailable",
        available: health.status === "running",
        canGenerate: health.canGenerate,
        supportsStreaming: model.supportsStreaming,
        warnings: health.warnings,
        diagnostics: {
          workerStatus: health.status,
          processManaged: health.processManaged,
          modelPathExists: health.modelPathExists,
          reason: health.reason,
        },
      };
    },
    async generate(): Promise<AillameTextGenerateResult> {
      const result = generateWithAillameTextWorkerPlaceholder({
        prompt: "",
      });
      return {
        success: result.success,
        modelId: model.id,
        runtimeKind: model.runtimeKind,
        content: result.content,
        finishReason: result.finishReason,
        usedLocalRuntime: false,
        degraded: result.degraded,
        warnings: result.warnings,
        diagnostics: {
          reasonCode: result.error?.code,
          runtimeStatus: "disabled",
        },
        error: result.error,
      };
    },
  };
}
