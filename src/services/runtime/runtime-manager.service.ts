import { 
  RuntimeAdapter, 
  RuntimeModelRef, 
  RuntimeLoadResult, 
  GenerateResult, 
  GenerateOptions,
  ModelInfo
} from "./runtime-adapter.types";
import { GGUFTextRuntimeAdapter } from "./gguf-text-runtime-adapter";
import { ActiveModelStateService } from "@/services/model/active-model-state.service";
import { InstalledModelRegistryService } from "@/services/model/installed-model-registry.service";
import { ModelStatusService } from "@/services/model/model-status.service";

const globalForRuntime = globalThis as unknown as {
  textAdapter: RuntimeAdapter | undefined;
  isGenerating: boolean | undefined;
};

export class RuntimeManager {
  private static get adapter(): RuntimeAdapter {
    // Phase 1.1: HMR & Memory Safety
    // If the adapter in globalThis exists but its class reference is stale (HMR),
    // or if we simply want to ensure a fresh instance after code changes.
    if (globalForRuntime.textAdapter) {
      const isStale = !(globalForRuntime.textAdapter instanceof GGUFTextRuntimeAdapter);
      if (isStale) {
        console.log("[RuntimeManager] Stale adapter detected (HMR). Unloading to clear VRAM...");
        // Synchronous part of cleanup
        const oldAdapter = globalForRuntime.textAdapter;
        globalForRuntime.textAdapter = undefined;
        // Background unload
        oldAdapter.unload().catch(err => console.error("[RuntimeManager] Failed to unload stale adapter:", err));
      }
    }

    if (!globalForRuntime.textAdapter) {
      globalForRuntime.textAdapter = new GGUFTextRuntimeAdapter();
    }
    return globalForRuntime.textAdapter;
  }

  private static get isGenerating(): boolean {
    return globalForRuntime.isGenerating || false;
  }

  private static set isGenerating(value: boolean) {
    globalForRuntime.isGenerating = value;
  }

  /**
   * Loads the current active text model into memory.
   */
  static async loadActiveTextModel(): Promise<RuntimeLoadResult> {
    const activeState = await ActiveModelStateService.getActiveState();
    
    if (!activeState.text) {
      return {
        ok: false,
        modelId: "none",
        modelPath: "none",
        durationMs: 0,
        status: "failed",
        error: {
          code: "ACTIVE_MODEL_NOT_SELECTED",
          message: "Aktif text model seçilmemiş."
        }
      };
    }

    const { modelId, path: modelPath } = activeState.text;

    // Validate via Phase 2 service
    const validation = await ActiveModelStateService.validateActiveModel();
    if (!validation.valid) {
      return {
        ok: false,
        modelId,
        modelPath,
        durationMs: 0,
        status: "failed",
        error: {
          code: "ACTIVE_MODEL_INVALID_OR_MISSING",
          message: validation.reason || "Aktif model geçersiz."
        }
      };
    }

    // Get model info from registry
    const installed = await InstalledModelRegistryService.getInstalledModels();
    const modelRecord = installed.find(m => m.id === modelId);

    if (!modelRecord) {
      return {
        ok: false,
        modelId,
        modelPath,
        durationMs: 0,
        status: "failed",
        error: {
          code: "MODEL_NOT_FOUND",
          message: "Model registry kaydı bulunamadı."
        }
      };
    }

    const modelRef: RuntimeModelRef = {
      id: modelRecord.id,
      type: "text",
      path: modelRecord.path,
      name: modelRecord.name,
      format: modelRecord.format
    };

    ModelStatusService.setStatus(modelId, "loading");
    
    const result = await this.adapter.load(modelRef);
    
    if (result.ok) {
      ModelStatusService.setStatus(modelId, "ready");
    } else {
      ModelStatusService.setStatus(modelId, "failed", result.error?.message);
    }

    return result;
  }

  /**
   * Generates response using the loaded active text model.
   */
  static async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    if (!prompt) {
      return {
        ok: false,
        text: "",
        modelId: "unknown",
        modelPath: "unknown",
        durationMs: 0,
        finishReason: "GENERATE_PROMPT_REQUIRED"
      };
    }

    if (!this.adapter.isReady()) {
      return {
        ok: false,
        text: "",
        modelId: "unknown",
        modelPath: "unknown",
        durationMs: 0,
        finishReason: "RUNTIME_NOT_READY"
      };
    }

    if (this.isGenerating) {
      return {
        ok: false,
        text: "",
        modelId: this.adapter.getModelInfo()?.id || "unknown",
        modelPath: this.adapter.getModelInfo()?.path || "unknown",
        durationMs: 0,
        finishReason: "RUNTIME_BUSY"
      };
    }

    const modelId = this.adapter.getModelInfo()?.id || "unknown";
    
    this.isGenerating = true;
    ModelStatusService.setStatus(modelId, "running");

    try {
      const result = await this.adapter.generate(prompt, options);
      ModelStatusService.setStatus(modelId, "ready");
      return result;
    } catch (error: any) {
      ModelStatusService.setStatus(modelId, "failed", error.message);
      return {
        ok: false,
        text: "",
        modelId,
        modelPath: this.adapter.getModelInfo()?.path || "unknown",
        durationMs: 0,
        finishReason: "GENERATION_FAILED"
      };
    } finally {
      this.isGenerating = false;
    }
  }

  static getTextRuntimeStatus() {
    const info = this.adapter.getModelInfo();
    return {
      loaded: this.adapter.isReady(),
      modelId: info?.id || null,
      status: info?.status || "not_loaded"
    };
  }

  static async unload() {
    const info = this.adapter.getModelInfo();
    if (info) {
      ModelStatusService.setStatus(info.id, "registered");
    }
    await this.adapter.unload();
    globalForRuntime.textAdapter = undefined;
    globalForRuntime.isGenerating = false;
  }
}
