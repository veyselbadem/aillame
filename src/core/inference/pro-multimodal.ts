import type { ImageAttachment } from '@apptypes/attachments';
import { MAX_IMAGE_ATTACHMENT_BYTES, SUPPORTED_IMAGE_MIME_TYPES } from '@apptypes/attachments';
import { PRO_CHAT_MODEL_ID } from '@core/models/registry';
import { VlmInferenceAdapter } from '@core/nano/vision/vlm-inference-adapter';

export type ProChatRequest = {
  prompt: string;
  images?: ImageAttachment[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
};

function validateImages(images: ImageAttachment[] = []) {
  if (images.length > 4) {
    throw new Error('Ayni istekte en fazla 4 gorsel analiz edilebilir.');
  }

  for (const image of images) {
    if (!(SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(image.mimeType)) {
      throw new Error('Desteklenen gorsel formatlari: PNG, JPG, JPEG, WEBP.');
    }

    if (image.size && image.size > MAX_IMAGE_ATTACHMENT_BYTES) {
      throw new Error('Her gorsel en fazla 10 MB olabilir.');
    }

    const dataUrl = image.dataUrl || image.data;
    if (!dataUrl || !dataUrl.startsWith(`data:${image.mimeType};base64,`)) {
      throw new Error('Gorsel verisi gecersiz.');
    }
  }
}

export async function generateProMultimodalResponse({
  prompt,
  images = [],
  maxTokens = 512,
  temperature = 0.7,
}: ProChatRequest): Promise<string> {
  validateImages(images);

  if (!prompt.trim() && images.length === 0) {
    throw new Error('Bir mesaj veya gorsel ekleyin.');
  }

  const normalizedPrompt = prompt.trim() || 'Bu gorseli ayrintili sekilde analiz et.';

  try {
    if (images.length > 0) {
      const firstImage = images[0];
      const imageData = firstImage.dataUrl || firstImage.data;
      if (!imageData) {
        throw new Error('Gorsel verisi gecersiz.');
      }

      const result = await VlmInferenceAdapter.analyzeImage({
        modelId: PRO_CHAT_MODEL_ID,
        image: imageData,
        prompt: normalizedPrompt,
        maxTokens,
      });

      if (!result.success) {
        throw new Error(result.message || result.errorCode || 'VLM inference failed.');
      }

      return result.text || '';
    }

    const { LocalRuntimeService } = await import('../../services/local-runtime.service');
    const result = await LocalRuntimeService.generateWithLocalRuntime({
      modelId: PRO_CHAT_MODEL_ID,
      prompt: {
        messages: [],
        plainText: normalizedPrompt,
      },
      options: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.text;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Bilinmeyen calisma zamani hatasi.';
    throw new Error(
      `Qwen3-VL 4B Nano Vision calistirilamadi. Yerel GGUF runtime, model.gguf ve mmproj.gguf hazir olmali. Ayrinti: ${reason}`
    );
  }
}
