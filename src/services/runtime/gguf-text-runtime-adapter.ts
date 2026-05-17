import type { Llama, LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";
import { safeImport } from "../../utils/esm-interop";
import { 
  RuntimeAdapter, 
  RuntimeModelRef, 
  RuntimeLoadResult, 
  GenerateResult, 
  GenerateOptions,
  ModelInfo
} from "./runtime-adapter.types";

export class GGUFTextRuntimeAdapter implements RuntimeAdapter {
  private llama: Llama | null = null;
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private currentModelRef: RuntimeModelRef | null = null;
  private status: "ready" | "loading" | "failed" | "not_loaded" = "not_loaded";

  isReady(): boolean {
    return this.status === "ready" && this.model !== null && this.context !== null;
  }

  async load(modelRef: RuntimeModelRef): Promise<RuntimeLoadResult> {
    // If already loaded the same model, return success
    if (this.isReady() && this.currentModelRef?.path === modelRef.path) {
      return {
        ok: true,
        modelId: modelRef.id,
        modelPath: modelRef.path,
        durationMs: 0,
        status: "ready"
      };
    }

    const startTime = Date.now();
    this.status = "loading";

    try {
      if (!this.llama) {
        const { getSharedLlama } = await import("./llama-instance");
        this.llama = await getSharedLlama();
      }

      // Unload previous if any
      await this.unload();

      const gpuLayers = process.env.AILLAME_GPU_LAYERS ? parseInt(process.env.AILLAME_GPU_LAYERS) : 100;
      console.log(`[GGUFAdapter] Loading model with gpuLayers: ${gpuLayers}`);
      
      this.model = await (this.llama as any).loadModel({
        modelPath: modelRef.path,
        gpuLayers: gpuLayers
      });

      this.context = await this.model!.createContext({
        contextSize: 2048
      });

      const { LlamaChatSession: LlamaChatSessionClass } = await safeImport("node-llama-cpp");
      this.session = new LlamaChatSessionClass({
        contextSequence: this.context.getSequence()
      });

      this.currentModelRef = modelRef;
      this.status = "ready";

      return {
        ok: true,
        modelId: modelRef.id,
        modelPath: modelRef.path,
        durationMs: Date.now() - startTime,
        status: "ready"
      };
    } catch (error: any) {
      this.status = "failed";
      return {
        ok: false,
        modelId: modelRef.id,
        modelPath: modelRef.path,
        durationMs: Date.now() - startTime,
        status: "failed",
        error: {
          code: "RUNTIME_LOAD_FAILED",
          message: error.message
        }
      };
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    if (!this.isReady() || !this.session) {
      throw new Error("Runtime not ready. Call load() first.");
    }

    const startTime = Date.now();
    try {
      // Phase 18: Reset history if no messages are provided (fresh start)
      if (!options?.messages || options.messages.length === 0) {
        const history: any[] = [];
        if (options?.systemPrompt) {
          history.push({
            role: "system",
            text: options.systemPrompt
          });
        }
        this.session.setChatHistory(history);
      }

      // Blocking generate as requested
      console.log(`[GGUFAdapter] Generating for prompt: "${prompt.substring(0, 50)}..."`);
      const response = await this.session.prompt(prompt, {
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
        customStopTriggers: [
          "<system_task>",
          "</system_task>",
          "User:",
          "Assistant:",
          "Kimlik:",
          "\n\n\n"
        ]
      });

      console.log(`[GGUFAdapter] Response: "${response.substring(0, 50)}..."`);

      return {
        ok: true,
        text: response,
        modelId: this.currentModelRef?.id || "unknown",
        modelPath: this.currentModelRef?.path || "unknown",
        durationMs: Date.now() - startTime,
        tokenCount: "not_available"
      };
    } catch (error: any) {
      return {
        ok: false,
        text: "",
        modelId: this.currentModelRef?.id || "unknown",
        modelPath: this.currentModelRef?.path || "unknown",
        durationMs: Date.now() - startTime,
        finishReason: "error"
      };
    }
  }

  getModelInfo(): ModelInfo | null {
    if (!this.currentModelRef) return null;
    return {
      id: this.currentModelRef.id,
      type: "text",
      path: this.currentModelRef.path,
      status: this.status
    };
  }

  async unload(): Promise<void> {
    this.session = null;
    this.context = null;
    this.model = null;
    this.currentModelRef = null;
    this.status = "not_loaded";
  }
}
