import { generateOllamaResponse, OllamaProviderError } from '@core/inference/ollama';
import type {
  InternalTextGenerationRequest,
  InternalTextGenerationResponse,
  InternalTextRuntimeConfig,
} from './model-types';

function isOllamaEnabled(): boolean {
  return process.env.AILLAME_OLLAMA_ENABLED !== 'false';
}

export function canUseOllamaFallback(): boolean {
  return isOllamaEnabled();
}

export async function generateWithOllamaFallback(
  request: InternalTextGenerationRequest,
  config: InternalTextRuntimeConfig,
): Promise<InternalTextGenerationResponse> {
  if (!isOllamaEnabled()) {
    return {
      success: false,
      provider: 'ollama',
      model: process.env.AILLAME_OLLAMA_TEXT_MODEL || 'gemma:2b',
      usedFallback: true,
      code: 'disabled',
      error: 'Ollama fallback provider is disabled.',
    };
  }

  const model = request.modelId || process.env.AILLAME_OLLAMA_TEXT_MODEL || 'gemma:2b';

  try {
    const answer = await generateOllamaResponse({
      prompt: request.prompt,
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      timeout: request.timeout ?? config.model.timeoutMs,
      model,
    });

    return {
      success: true,
      provider: 'ollama',
      answer,
      model,
      usedFallback: true,
    };
  } catch (error) {
    if (error instanceof OllamaProviderError) {
      return {
        success: false,
        provider: 'ollama',
        model,
        usedFallback: true,
        code: error.code,
        error: error.message,
      };
    }

    const message = error instanceof Error ? error.message : 'Ollama fallback failed.';
    return {
      success: false,
      provider: 'ollama',
      model,
      usedFallback: true,
      code: 'unknown_error',
      error: message,
    };
  }
}
