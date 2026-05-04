import { checkGemmaServerHealth, ensureGemmaServerRunning, getGemmaRuntimeStatus } from '@core/local-runtime/gemma-runtime-manager';
import { warmUpGemmaRuntime } from '@core/local-runtime/gemma-startup';
import { generateGemmaResponse, GemmaProviderError } from '@core/inference/gemma';
import type {
  InternalTextGenerationRequest,
  InternalTextGenerationResponse,
  InternalTextRuntimeConfig,
  InternalTextRuntimeStatus,
} from './model-types';

export async function ensureGemmaInternalReady(config: InternalTextRuntimeConfig): Promise<void> {
  if (!config.model.autoStart) {
    return;
  }

  await ensureGemmaServerRunning();
}

export async function warmupGemmaInternalRuntime(): Promise<void> {
  await warmUpGemmaRuntime({ wait: true });
}

export async function getGemmaInternalRuntimeSnapshot(): Promise<{
  running: boolean;
  configured: boolean;
  details: Awaited<ReturnType<typeof getGemmaRuntimeStatus>>;
}> {
  const details = await getGemmaRuntimeStatus();
  const running = await checkGemmaServerHealth(details.serverUrl);
  const configured = details.modelPathConfigured && details.llamaServerPathConfigured;

  return {
    running,
    configured,
    details,
  };
}

export async function generateWithGemmaInternal(
  request: InternalTextGenerationRequest,
  config: InternalTextRuntimeConfig,
): Promise<InternalTextGenerationResponse> {
  try {
    const answer = await generateGemmaResponse({
      prompt: request.prompt,
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      timeout: request.timeout ?? config.model.timeoutMs,
    });

    return {
      success: true,
      provider: 'gemma',
      answer,
      model: request.modelId ?? config.model.modelId,
      usedFallback: false,
    };
  } catch (error) {
    if (error instanceof GemmaProviderError) {
      return {
        success: false,
        provider: 'gemma',
        model: request.modelId ?? config.model.modelId,
        usedFallback: false,
        code: error.code,
        error: error.message,
        hint: error.hint,
      };
    }

    const message = error instanceof Error ? error.message : 'Gemma internal runtime failed.';
    return {
      success: false,
      provider: 'gemma',
      model: request.modelId ?? config.model.modelId,
      usedFallback: false,
      code: 'unknown_error',
      error: message,
    };
  }
}

export function mergeGemmaRuntimeIntoUnifiedStatus(
  base: InternalTextRuntimeStatus,
  snapshot: Awaited<ReturnType<typeof getGemmaInternalRuntimeSnapshot>>,
): InternalTextRuntimeStatus {
  if (!snapshot.configured || !snapshot.running) {
    const reason = !snapshot.configured
      ? 'Gemma runtime is not fully configured.'
      : 'Gemma runtime server is not running.';

    return {
      ...base,
      health: base.enabled ? 'degraded' : base.health,
      lastError: base.lastError ?? reason,
    };
  }

  return base;
}
