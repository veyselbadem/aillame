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
      const currentReadiness = checkGgufWorkerReadiness();
      if (!currentReadiness.canGenerate || !currentReadiness.manifest.modelPath) {
        return {
          success: false,
          modelId: model.id,
          runtimeKind: model.runtimeKind,
          content: "",
          finishReason: "error",
          usedLocalRuntime: false,
          degraded: true,
          warnings: [],
          error: {
            code: "GGUF_RUNTIME_NOT_READY",
            message: currentReadiness.blockedReasons.join("; ") || "GGUF runtime is not ready.",
          },
        };
      }

      // In this phase, we assume the server is either already running or we use a basic fetch
      // to the configured URL. A more robust lifecycle manager will be added in Faz 2.
      const port = process.env.AILLAME_GEMMA_PORT || "8080";
      const url = `http://127.0.0.1:${port}/completion`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: request.prompt,
            n_predict: request.maxTokens || 1024,
            temperature: request.temperature || 0.7,
            stop: ["\n\n", "###", "Instruction:", "Response:"],
          }),
        });

        if (!response.ok) {
          throw new Error(`GGUF server returned ${response.status}`);
        }

        const json = await response.json() as any;
        const content = json.content || "";

        return {
          success: true,
          modelId: model.id,
          runtimeKind: model.runtimeKind,
          content,
          finishReason: "stop",
          usedLocalRuntime: true,
          degraded: false,
          warnings: [],
        };
      } catch (err: any) {
        return {
          success: false,
          modelId: model.id,
          runtimeKind: model.runtimeKind,
          content: "",
          finishReason: "error",
          usedLocalRuntime: false,
          degraded: true,
          warnings: [],
          error: {
            code: "GGUF_GENERATION_FAILED",
            message: err.message || "Failed to communicate with GGUF worker.",
          },
        };
      }
    },
  };
}
