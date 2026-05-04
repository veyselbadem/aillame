import type {
  InternalTextGenerationResponse,
  InternalTextRuntimeConfig,
} from './model-types';
import { canUseOllamaFallback, generateWithOllamaFallback } from './integration-ollama';

export async function resolveTextProviderFallback(
  primaryResult: InternalTextGenerationResponse,
  request: {
    prompt: string;
    messages?: Array<{ role?: string; content?: string }>;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    modelId?: string;
  },
  config: InternalTextRuntimeConfig,
): Promise<InternalTextGenerationResponse> {
  if (primaryResult.success) {
    return primaryResult;
  }

  if (!config.fallbackProvider) {
    return primaryResult;
  }

  if (config.fallbackProvider === 'ollama') {
    if (!canUseOllamaFallback()) {
      return {
        ...primaryResult,
        code: primaryResult.code ?? 'fallback_unavailable',
        error: primaryResult.error || 'Primary provider failed and Ollama fallback is unavailable.',
      };
    }

    const fallbackResult = await generateWithOllamaFallback(request, config);
    if (fallbackResult.success) {
      return fallbackResult;
    }

    return {
      ...primaryResult,
      code: primaryResult.code ?? fallbackResult.code ?? 'fallback_failed',
      error: primaryResult.error || fallbackResult.error || 'Primary and fallback providers both failed.',
    };
  }

  return primaryResult;
}

export function assertRemoteFallbackPolicy(config: InternalTextRuntimeConfig): { allowed: boolean; reason?: string } {
  if (!config.allowRemoteFallback) {
    return {
      allowed: false,
      reason: 'Remote fallback is disabled by policy in this phase.',
    };
  }

  return {
    allowed: true,
  };
}
