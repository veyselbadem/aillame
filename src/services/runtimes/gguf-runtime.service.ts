import { 
  AillameRuntimeAdapter, 
  AillameRuntimeInput, 
  AillameRuntimeResult, 
  AillameRuntimeOutput 
} from '../../types/runtime.types';
import { ModelRegistryService } from '../model-registry.service';
import fs from 'fs';
import { RUNTIME_CONFIG } from '../../config/runtime.config';
import { createRuntimeError } from '../../utils/runtime-errors';
import { safeImport } from '../../utils/esm-interop';

export class GgufRuntimeService implements AillameRuntimeAdapter {
  runtime = "aillame-gguf";
  
  // Model cache to avoid reloading files
  private static llamaInstance: any = null;
  private static modelCache = new Map<string, any>();
  private static contextCache = new Map<string, any>();

  async checkAvailability(): Promise<boolean> {
    try {
      const { getLlama } = await safeImport("node-llama-cpp");
      return !!getLlama;
    } catch {
      return false;
    }
  }

  private async getLlama() {
    const { getSharedLlama } = await import("../runtime/llama-instance");
    return await getSharedLlama();
  }

  async generate(input: AillameRuntimeInput): Promise<AillameRuntimeResult> {
    const { modelId, prompt, options } = input;
    const startTime = Date.now();

    // 1. Find model in registry
    const model = await ModelRegistryService.getModelById(modelId);
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

    // 4b. Dev Mode Native Runtime Gate
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const isWatch = process.env.TSX_WATCH === 'true' || process.argv.some(arg => arg.includes('tsx'));
    
    if (isDev && RUNTIME_CONFIG.disableNativeInferenceInDev) {
      return createRuntimeError("DEV_MODE_NATIVE_DISABLED", "Yerel inference geliştirme modunda (TSX) devre dışı bırakıldı. Lütfen derlenmiş server ile çalıştırın veya AILLAME_DISABLE_NATIVE_INFERENCE_IN_DEV=false yapın.", { modelId, runtime: this.runtime });
    }

    // 5. Real Inference Integration
    try {
      // Check for known unsupported architectures (Gemma 4 etc)
      if (model.unsupportedReason) {
        return createRuntimeError("UNSUPPORTED_ARCHITECTURE", `Model mimarisi desteklenmiyor: ${model.unsupportedReason}`, { modelId, runtime: this.runtime });
      }

      const llama = await this.getLlama();

      const { LlamaChatSession } = await safeImport("node-llama-cpp");

      // Get or load model
      let llamaModel = GgufRuntimeService.modelCache.get(modelId);
      if (!llamaModel) {
        // 5a. Multimodal (VLM) Check (Phase L)
        if (model.modality === 'vision_language' || (model as any).mmprojPath) {
          const mmprojPath = (model as any).mmprojPath;
          if (!mmprojPath || !fs.existsSync(mmprojPath)) {
            return createRuntimeError("MMPROJ_MISSING", "Vision modeli için gerekli .mmproj dosyası bulunamadı.", { modelId, runtime: this.runtime });
          }
          // Skeleton: node-llama-cpp loading with mmprojPath would go here
        }

        try {
          const loadOptions: any = {
            modelPath: ModelRegistryService.resolveModelPath(model.path),
            gpuLayers: options?.gpuLayers ?? RUNTIME_CONFIG.gpuLayers,
          };

          if ((model as any).mmprojPath && fs.existsSync((model as any).mmprojPath)) {
            loadOptions.mmprojPath = (model as any).mmprojPath;
          }

          llamaModel = await llama.loadModel(loadOptions);
          GgufRuntimeService.modelCache.set(modelId, llamaModel);
        } catch (loadError: any) {
          if (loadError.message.includes('unknown model architecture')) {
            const arch = loadError.message.match(/'([^']+)'/)?.[1] || 'unknown';
            return createRuntimeError("UNSUPPORTED_ARCHITECTURE", `Bu model mimarisi (${arch}) mevcut runtime tarafından desteklenmiyor.`, { modelId, runtime: this.runtime });
          }
          throw loadError;
        }
      }
 
      // Get or create context
      let llamaContext = GgufRuntimeService.contextCache.get(modelId);
      if (!llamaContext) {
        llamaContext = await llamaModel.createContext({
          contextSize: options?.contextWindow || (model as any).contextWindow || 4096
        });
        GgufRuntimeService.contextCache.set(modelId, llamaContext);
      }
 
      const sequence = llamaContext.getSequence();
      try {
        const session = new LlamaChatSession({
          contextSequence: sequence
        });
  
        const abortController = new AbortController();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            abortController.abort();
            reject(new Error("TIMEOUT"));
          }, RUNTIME_CONFIG.defaultTimeoutMs);
        });
  
        // Prepare prompt with attachments if present
        const promptOptions: any = {
          temperature: options?.temperature ?? (model as any).temperature ?? RUNTIME_CONFIG.defaultTemperature,
          maxTokens: options?.maxOutputTokens ?? (model as any).maxOutputTokens ?? RUNTIME_CONFIG.defaultMaxOutputTokens,
          signal: abortController.signal
        };

        if (input.attachments && input.attachments.length > 0) {
           promptOptions.attachments = input.attachments.map(a => ({
             type: 'image',
             data: typeof a.data === 'string' ? Buffer.from(a.data, 'base64') : a.data
           }));
        }

        const inferencePromise = session.prompt(prompt.plainText + "\n\nASSISTANT RESPONSE:", promptOptions);
  
        const responseText = await Promise.race([inferencePromise, timeoutPromise]);
  
        return {
          success: true,
          text: responseText,
          modelId,
          runtime: this.runtime,
          usage: {
            promptTokens: 0, completionTokens: 0, totalTokens: 0
          },
          meta: {
            durationMs: Date.now() - startTime,
            mock: false
          }
        };
      } finally {
        sequence.dispose();
      }

    } catch (error: any) {
      if (error.message === "PACKAGE_NOT_FOUND") {
        return createRuntimeError("RUNTIME_UNAVAILABLE", "GGUF runtime paketi (node-llama-cpp) yüklenemedi.", { modelId, runtime: this.runtime });
      }
      if (error.message === "TIMEOUT") {
        return createRuntimeError("LOCAL_INFERENCE_TIMEOUT", "Model cevap üretirken zaman aşımına uğradı. (Runtime Hang koruması aktif)", { modelId, runtime: this.runtime });
      }
      
      console.error("[GGUF Runtime Error]:", error.message); // Log message only, no stack trace to user
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
