import type { ImageAttachment } from '@apptypes/attachments';
import { MAX_IMAGE_ATTACHMENT_BYTES, SUPPORTED_IMAGE_MIME_TYPES } from '@apptypes/attachments';
import { getModel, PRO_CHAT_MODEL_ID } from '@core/models/registry';
import { getScriptPath, parsePythonJson, runPythonScript } from '@core/model-management/python-runner';

export type ProChatRequest = {
  prompt: string;
  images?: ImageAttachment[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
};

type PythonQwenResponse = {
  response: string;
  modelId: string;
};

function validateImages(images: ImageAttachment[] = []) {
  if (images.length > 4) {
    throw new Error('Aynı istekte en fazla 4 görsel analiz edilebilir.');
  }

  for (const image of images) {
    if (!(SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(image.mimeType)) {
      throw new Error('Desteklenen görsel formatları: PNG, JPG, JPEG, WEBP.');
    }

    if (image.size && image.size > MAX_IMAGE_ATTACHMENT_BYTES) {
      throw new Error('Her görsel en fazla 10 MB olabilir.');
    }

    const dataUrl = image.dataUrl || image.data;
    if (!dataUrl || !dataUrl.startsWith(`data:${image.mimeType};base64,`)) {
      throw new Error('Görsel verisi geçersiz.');
    }
  }
}

export async function generateProMultimodalResponse({
  prompt,
  images = [],
  maxTokens = 512,
  temperature = 0.7,
  timeout,
}: ProChatRequest): Promise<string> {
  const model = getModel(PRO_CHAT_MODEL_ID);
  validateImages(images);

  if (!prompt.trim() && images.length === 0) {
    throw new Error('Bir mesaj veya görsel ekleyin.');
  }

  const runnerInput = {
    modelId: model.repoId,
    prompt: prompt.trim() || 'Bu görseli ayrıntılı şekilde analiz et.',
    images: images.map((image) => ({
      name: image.name,
      mimeType: image.mimeType,
      dataUrl: image.dataUrl || image.data,
    })),
    maxNewTokens: maxTokens,
    temperature,
  };

  try {
    const result = await runPythonScript(
      getScriptPath('inference', 'scripts', 'qwen3_vl_infer.py'),
      [],
      runnerInput,
      timeout || (images.length > 0 ? 3 * 60 * 1000 : 90 * 1000)
    );
    const parsed = parsePythonJson<PythonQwenResponse>(result);
    return parsed.response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Bilinmeyen çalışma zamanı hatası.';
    throw new Error(
      `Qwen3-VL 8B çalıştırılamadı. Python Transformers çalışma zamanı ve model dosyaları hazır olmalı. Ayrıntı: ${reason}`
    );
  }
}
