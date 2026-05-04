import { generateWithGemmaInternal } from './integration-gemma';
import type {
  InternalTextGenerationRequest,
  InternalTextGenerationResponse,
  InternalTextRuntimeConfig,
} from './model-types';

function trimPrompt(prompt: string, maxChars: number): string {
  if (prompt.length <= maxChars) return prompt;
  return prompt.slice(0, maxChars);
}

export async function generateWithGgufRuntimeAdapter(
  request: InternalTextGenerationRequest,
  config: InternalTextRuntimeConfig,
): Promise<InternalTextGenerationResponse> {
  const normalizedRequest: InternalTextGenerationRequest = {
    ...request,
    prompt: trimPrompt(request.prompt, config.model.maxInputChars),
    modelId: request.modelId || config.model.modelId,
  };

  // Faz 1: GGUF runtime adapter, mevcut Gemma/llama-server yolunu genelleyerek kullanır.
  return generateWithGemmaInternal(normalizedRequest, config);
}
