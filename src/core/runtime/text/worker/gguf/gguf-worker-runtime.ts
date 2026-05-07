import type { AillameTextRuntime, AillameTextRuntimeHealth } from "../../text-runtime-interface";
import type { AillameTextGenerateRequest, AillameTextGenerateResult, AillameTextRuntimeModelInfo, AillameTextRuntimeCapability } from "../../text-runtime-types";
import { getGgufWorkerConfig } from "./gguf-worker-config";
import { checkGgufWorkerReadiness } from "./gguf-worker-readiness";

export function createGgufWorkerRuntime(): AillameTextRuntime {
  const config = getGgufWorkerConfig();
  const readiness = checkGgufWorkerReadiness();
  
  const model: AillameTextRuntimeModelInfo = {
    id: readiness.manifest.id,
    label: readiness.manifest.label,
    runtimeKind: "llama-server-gguf",
    status: readiness.canEnable ? "available" : "disabled",
    capabilities: readiness.manifest.capabilities as any,
    supportsStreaming: readiness.manifest.supportsStreaming,
    supportsSystemPrompt: true,
    supportsTools: false,
    notes: readiness.manifest.notes,
  };

  return {
    model,
    canHandle(request: AillameTextGenerateRequest, capabilities: readonly AillameTextRuntimeCapability[] = []) {
      if (!config.enabled) return false;
      if (!readiness.canGenerate) return false;
      return capabilities.every(c => model.capabilities.includes(c as any));
    },
    getHealth(): AillameTextRuntimeHealth {
      const currentReadiness = checkGgufWorkerReadiness();
      return {
        modelId: model.id,
        runtimeKind: model.runtimeKind,
        status: currentReadiness.canEnable ? "available" : "unavailable",
        available: currentReadiness.canEnable,
        canGenerate: currentReadiness.canGenerate,
        supportsStreaming: model.supportsStreaming,
        warnings: currentReadiness.warnings,
        diagnostics: {
          state: currentReadiness.state,
          modelPathExists: currentReadiness.modelPathExists,
          blockedReasons: currentReadiness.blockedReasons,
        },
      };
    },
    async generate(request: AillameTextGenerateRequest): Promise<AillameTextGenerateResult> {
      // Faz 1: Implementation of actual spawn/generation logic is pending.
      // This bridges the readiness/config to the router.
      return {
        success: false,
        modelId: model.id,
        runtimeKind: model.runtimeKind,
        content: "",
        finishReason: "unsupported",
        usedLocalRuntime: false,
        degraded: true,
        warnings: ["GGUF generation implementation is pending in this foundation phase."],
        error: {
          code: "GGUF_GENERATION_PENDING",
          message: "GGUF worker readiness is established, but generation is not yet implemented.",
        },
      };
    },
  };
}
