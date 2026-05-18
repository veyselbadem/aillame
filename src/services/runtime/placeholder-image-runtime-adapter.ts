import { 
  RuntimeAdapter, 
  RuntimeModelRef, 
  RuntimeLoadResult, 
  GenerateResult, 
  GenerateOptions,
  ModelInfo
} from "./runtime-adapter.types";

/**
 * Placeholder for Image Generation.
 * Actual implementation planned for Phase 5.
 */
export class PlaceholderImageRuntimeAdapter implements RuntimeAdapter {
  private currentModelRef: RuntimeModelRef | null = null;
  private status: "ready" | "loading" | "failed" | "not_loaded" = "not_loaded";

  isReady(): boolean {
    return true; // Always "ready" for placeholder
  }

  async load(model: RuntimeModelRef): Promise<RuntimeLoadResult> {
    this.currentModelRef = model;
    this.status = "ready";
    return {
      ok: true,
      modelId: model.id,
      modelPath: model.path,
      durationMs: 0,
      status: "ready"
    };
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    return {
      ok: true,
      text: "IMAGE_PLACEHOLDER_RESPONSE",
      modelId: this.currentModelRef?.id || "placeholder-image",
      modelPath: "none",
      durationMs: 0,
      tokenCount: "not_available"
    };
  }

  getModelInfo(): ModelInfo | null {
    return {
      id: "placeholder-image",
      type: "image",
      path: "none",
      status: this.status
    };
  }

  async unload(): Promise<void> {
    this.status = "not_loaded";
  }
}
