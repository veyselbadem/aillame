import type { Llama, LlamaModel, LlamaEmbeddingContext } from "node-llama-cpp";
import { safeImport } from "../../utils/esm-interop";
import { ActiveModelStateService } from "../model/active-model-state.service";

/**
 * Faz 2.1: Embedding Service using node-llama-cpp
 */
export class EmbeddingService {
  private static llama: Llama | null = null;
  private static model: LlamaModel | null = null;
  private static context: LlamaEmbeddingContext | null = null;

  private static async init() {
    if (this.context) return;

    const activeState = await ActiveModelStateService.getActiveState();
    if (!activeState.text) {
      throw new Error("No active model for embeddings.");
    }

    if (!this.llama) {
      const { getSharedLlama } = await import("./llama-instance");
      this.llama = await getSharedLlama();
    }

    if (!this.model) {
      const gpuLayers = process.env.AILLAME_GPU_LAYERS ? parseInt(process.env.AILLAME_GPU_LAYERS) : 100;
      this.model = await (this.llama as any).loadModel({
        modelPath: activeState.text.path,
        gpuLayers: gpuLayers
      });
    }

    this.context = await this.model!.createEmbeddingContext();
  }

  /**
   * Generates a vector embedding for the given text.
   */
  static async getEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now();
    await this.init();
    
    if (!this.context) throw new Error("Failed to initialize embedding context.");

    const embedding = await this.context.getEmbeddingFor(text);
    const duration = Date.now() - startTime;
    
    console.log(`[EmbeddingService] Generated embedding in ${duration}ms`);
    return Array.from(embedding.vector);
  }

  /**
   * Unloads the embedding model from memory.
   */
  static async unload() {
    this.context = null;
    this.model = null;
    this.llama = null;
  }
}
