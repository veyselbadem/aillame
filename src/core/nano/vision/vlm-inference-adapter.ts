import { LocalRuntimeService } from '../../../services/local-runtime.service';
import { CapabilityRegistry } from '../../models/capability-registry';
import fs from 'fs';
import path from 'path';

export interface VlmInferenceRequest {
  modelId?: string;
  image: string | Buffer; // Path, Base64 or Buffer
  prompt: string;
  maxTokens?: number;
  gpuLayers?: number;
  runtimeProfile?: 'low' | 'balanced' | 'high';
}

export interface VlmInferenceResponse {
  success: boolean;
  text?: string;
  errorCode?: string;
  message?: string;
  latencyMs?: number;
}

/**
 * VLM Inference Adapter - Phase Q
 * 
 * Handles normalization of image inputs and execution of vision-language tasks.
 */
export class VlmInferenceAdapter {
  private static readonly DEFAULT_TIMEOUT = 120000;

  /**
   * Performs vision analysis using the best available VLM.
   */
  static async analyzeImage(request: VlmInferenceRequest): Promise<VlmInferenceResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Resolve Model
      let modelId = request.modelId;
      if (!modelId) {
        const bestModel = await CapabilityRegistry.resolveBestModelForCapability('vision.review');
        if (!bestModel) {
          return { success: false, errorCode: 'VLM_MODEL_NOT_READY', message: 'Uygun VLM modeli bulunamadı.' };
        }
        modelId = bestModel.id;
      }

      // 2. Normalize Image Data
      const imageData = await this.normalizeImageData(request.image);
      if (!imageData) {
        return { success: false, errorCode: 'IMAGE_FILE_NOT_FOUND', message: 'Görsel verisi geçersiz veya dosya bulunamadı.' };
      }

      // 3. Execute via Runtime
      const result = await LocalRuntimeService.generateWithLocalRuntime({
        modelId,
        prompt: {
          messages: [],
          plainText: request.prompt
        },
        attachments: [
          {
            type: 'image',
            data: imageData
          }
        ],
        options: {
          maxOutputTokens: request.maxTokens || 512,
          gpuLayers: request.gpuLayers,
          runtimeProfile: request.runtimeProfile,
          temperature: 0.2 // Lower temperature for more objective analysis
        }
      });

      if (!result.success) {
        return { 
          success: false, 
          errorCode: result.error.code || 'VLM_INFERENCE_FAILED', 
          message: result.error.message 
        };
      }

      return {
        success: true,
        text: result.text.trim(),
        latencyMs: Date.now() - startTime
      };

    } catch (error: any) {
      console.error('[VLM Adapter] Critical Error:', error.message);
      return { 
        success: false, 
        errorCode: 'VLM_INFERENCE_FAILED', 
        message: 'Görsel işleme sırasında teknik bir hata oluştu.' 
      };
    }
  }

  /**
   * Normalizes image input into a Buffer.
   */
  private static async normalizeImageData(image: string | Buffer): Promise<Buffer | null> {
    if (Buffer.isBuffer(image)) return image;

    if (typeof image !== 'string') return null;

    // 1. Check if it's base64
    if (image.startsWith('data:image')) {
      const base64Data = image.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    if (image.length > 500) { // Likely raw base64 without prefix
        try {
            return Buffer.from(image, 'base64');
        } catch { /* proceed to path check */ }
    }

    // 2. Check if it's a file path
    try {
      if (fs.existsSync(image)) {
        // Validate extension
        const ext = path.extname(image).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
          return null; // Unsupported format
        }
        return await fs.promises.readFile(image);
      }
    } catch {
      return null;
    }

    return null;
  }
}
