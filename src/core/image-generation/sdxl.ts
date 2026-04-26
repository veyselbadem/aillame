import { DEFAULT_IMAGE_GENERATION_MODEL_ID, getModel } from '@core/models/registry';
import { getScriptPath, parsePythonJson, runPythonScript } from '@core/model-management/python-runner';
import { IMAGE_SIZE_PRESETS, type ImageGenerationRequest, type ImageGenerationResult } from './types';

function clampDimension(value: number): number {
  const rounded = Math.round(value / 8) * 8;
  return Math.min(1536, Math.max(512, rounded));
}

function normalizeRequest(request: ImageGenerationRequest) {
  if (!request.prompt?.trim()) {
    throw new Error('Görsel üretimi için bir prompt yazın.');
  }

  const preset = request.preset ? IMAGE_SIZE_PRESETS[request.preset] : IMAGE_SIZE_PRESETS.square;
  const width = clampDimension(request.width ?? preset.width);
  const height = clampDimension(request.height ?? preset.height);
  const steps = Math.min(60, Math.max(10, Math.round(request.steps ?? 30)));

  return {
    prompt: request.prompt.trim(),
    negativePrompt: request.negativePrompt?.trim() || '',
    width,
    height,
    steps,
    seed: request.seed,
  };
}

export async function generateImageWithSdxl(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const model = getModel(DEFAULT_IMAGE_GENERATION_MODEL_ID);
  const normalized = normalizeRequest(request);

  try {
    const result = await runPythonScript(
      getScriptPath('image-generation', 'scripts', 'sdxl_generate.py'),
      [],
      {
        modelId: model.repoId,
        ...normalized,
      },
      20 * 60 * 1000
    );

    return parsePythonJson<ImageGenerationResult>(result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Bilinmeyen çalışma zamanı hatası.';
    throw new Error(
      `SDXL Base çalıştırılamadı. Python Diffusers çalışma zamanı ve model dosyaları hazır olmalı. Ayrıntı: ${reason}`
    );
  }
}
