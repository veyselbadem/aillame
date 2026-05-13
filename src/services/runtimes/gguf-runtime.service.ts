import { 
  AillameRuntimeAdapter, 
  AillameRuntimeInput, 
  AillameRuntimeResult, 
  AillameRuntimeOutput 
} from '../../types/runtime.types';
import { ModelRegistryService } from '../model-registry.service';
import { RUNTIME_CONFIG } from '../../config/runtime.config';
import { createRuntimeError } from '../../utils/runtime-errors';

export class GgufRuntimeService implements AillameRuntimeAdapter {
  runtime = "aillame-gguf";
  
  // Model cache to avoid reloading files
  private static llamaInstance: any = null;
  private static modelCache = new Map<string, any>();
  private static contextCache = new Map<string, any>();

  async checkAvailability(): Promise<boolean> {
    try {
      const { getLlama } = await import("node-llama-cpp");
      return !!getLlama;
    } catch {
      return false;
    }
  }

  private async getLlama() {
    if (!GgufRuntimeService.llamaInstance) {
      const { getLlama } = await import("node-llama-cpp");
      GgufRuntimeService.llamaInstance = await getLlama();
    }
    return GgufRuntimeService.llamaInstance;
  }

  async generate(input: AillameRuntimeInput): Promise<AillameRuntimeResult> {
    const { modelId, prompt, options } = input;
    const startTime = Date.now();

    // 1. Find model in registry
    const model = ModelRegistryService.getModelById(modelId);
    if (!model) {
      return createRuntimeError("MODEL_NOT_FOUND", "Belirtilen model bulunamadı.", { modelId, runtime: this.runtime });
    }

    // 2. Validate path security
    if (model.path.includes('..')) {
      return createRuntimeError("INVALID_MODEL_PATH", "Model path güvenli değil.", { modelId, runtime: this.runtime });
    }

    // 3. Check model existence
    const exists = ModelRegistryService.checkModelExists(model);
    if (!exists) {
      return createRuntimeError("MODEL_FILE_MISSING", "Model dosyası bulunamadı.", { modelId, runtime: this.runtime });
    }

    // 4. Handle Real Inference vs Mock Fallback
    if (!RUNTIME_CONFIG.enableRealInference) {
      if (RUNTIME_CONFIG.allowMockFallback) {
        return this.generateMockOutput(modelId);
      } else {
        return createRuntimeError("RUNTIME_UNAVAILABLE", "Gerçek inference şu anda kapalı.", { modelId, runtime: this.runtime });
      }
    }

    // 5. Real Inference Integration
    try {
      const llama = await this.getLlama().catch(() => {
        throw new Error("PACKAGE_NOT_FOUND");
      });

      const { LlamaChatSession } = await import("node-llama-cpp");

      // Get or load model
      let llamaModel = GgufRuntimeService.modelCache.get(modelId);
      if (!llamaModel) {
        llamaModel = await llama.loadModel({
          modelPath: ModelRegistryService.resolveModelPath(model.path)
        });
        GgufRuntimeService.modelCache.set(modelId, llamaModel);
      }

      // Get or create context
      let llamaContext = GgufRuntimeService.contextCache.get(modelId);
      if (!llamaContext) {
        llamaContext = await llamaModel.createContext({
          contextSize: options?.contextWindow || model.contextWindow || 4096
        });
        GgufRuntimeService.contextCache.set(modelId, llamaContext);
      }

      const session = new LlamaChatSession({
        contextSequence: llamaContext.getSequence()
      });

      // Timeout implementation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), RUNTIME_CONFIG.defaultTimeoutMs);
      });

      const inferencePromise = session.prompt(prompt.plainText + "\n\nASSISTANT RESPONSE:", {
        temperature: options?.temperature ?? model.temperature ?? RUNTIME_CONFIG.defaultTemperature,
        maxTokens: options?.maxOutputTokens ?? model.maxOutputTokens ?? RUNTIME_CONFIG.defaultMaxOutputTokens
      });

      const responseText = await Promise.race([inferencePromise, timeoutPromise]);

      return {
        success: true,
        text: responseText,
        modelId,
        runtime: this.runtime,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        meta: {
          durationMs: Date.now() - startTime,
          mock: false
        }
      };

    } catch (error: any) {
      if (error.message === "PACKAGE_NOT_FOUND") {
        return createRuntimeError("RUNTIME_UNAVAILABLE", "GGUF runtime paketi (node-llama-cpp) yüklenemedi.", { modelId, runtime: this.runtime });
      }
      if (error.message === "TIMEOUT") {
        return createRuntimeError("RUNTIME_TIMEOUT", "Model cevap üretirken zaman aşımına uğradı.", { modelId, runtime: this.runtime });
      }
      
      console.error("[GGUF Runtime Error]:", error);
      return createRuntimeError("RUNTIME_INFERENCE_FAILED", `Model çalıştırma hatası: ${error.message}`, { modelId, runtime: this.runtime });
    }
  }

  private generateMockOutput(modelId: string): AillameRuntimeOutput {
    return {
      success: true,
      text: "Aillame Local Runtime mock cevabı. Gerçek inference şu anda kapalı veya yapılandırılmadı.",
      modelId,
      runtime: this.runtime,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      meta: {
        durationMs: 15,
        mock: true
      }
    };
  }
}
