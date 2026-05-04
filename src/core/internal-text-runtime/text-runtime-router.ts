import { getInternalTextRuntimeConfig } from './config';
import {
  beginInferenceLock,
  markInferenceActive,
  markInferenceReady,
  markLockDegraded,
  unlockHeavyModel,
} from './lock-manager';
import {
  getInternalTextRuntimeStatus,
  markRuntimeRequestError,
  markRuntimeRequestStart,
  markRuntimeRequestSuccess,
  maybeUnloadByIdlePolicy,
  setActiveModel,
  setRuntimeEnabled,
  setRuntimeHealth,
} from './runtime-state';
import { ensureGemmaInternalReady, generateWithGemmaInternal, getGemmaInternalRuntimeSnapshot, mergeGemmaRuntimeIntoUnifiedStatus } from './integration-gemma';
import { generateWithGgufRuntimeAdapter } from './gguf-runtime-adapter';
import { resolveTextProviderFallback } from './provider-fallback';
import type {
  HeavyModelOwner,
  InternalTextGenerationRequest,
  InternalTextGenerationResponse,
  InternalTextProvider,
  InternalTextRuntimeStatus,
} from './model-types';

function resolveProvider(request: InternalTextGenerationRequest): InternalTextProvider {
  const config = getInternalTextRuntimeConfig();
  return request.preferredProvider || config.defaultProvider;
}

async function runPrimaryProvider(
  provider: InternalTextProvider,
  request: InternalTextGenerationRequest,
): Promise<InternalTextGenerationResponse> {
  const config = getInternalTextRuntimeConfig();

  if (provider === 'gguf') {
    await ensureGemmaInternalReady(config);
    return generateWithGgufRuntimeAdapter(request, config);
  }

  if (provider === 'gemma') {
    await ensureGemmaInternalReady(config);
    return generateWithGemmaInternal(request, config);
  }

  return {
    success: false,
    provider,
    model: request.modelId || config.model.modelId,
    usedFallback: false,
    code: 'unsupported_primary_provider',
    error: `Primary internal provider is not supported in this phase: ${provider}`,
  };
}

export async function runInternalTextGeneration(
  request: InternalTextGenerationRequest,
): Promise<InternalTextGenerationResponse> {
  const config = getInternalTextRuntimeConfig();
  setRuntimeEnabled(config.enabled);

  if (!config.enabled) {
    setRuntimeHealth('disabled', 'Internal text runtime is disabled.');
    return {
      success: false,
      provider: config.defaultProvider,
      model: request.modelId || config.model.modelId,
      usedFallback: false,
      code: 'runtime_disabled',
      error: 'Internal text runtime is disabled.',
    };
  }

  const provider = resolveProvider(request);
  const modelId = request.modelId || config.model.modelId;
  const owner: HeavyModelOwner = { provider, modelId };
  const startedAt = Date.now();

  try {
    beginInferenceLock(owner, config.lockTimeoutMs);
    markInferenceActive(owner, config.lockTimeoutMs);
    setActiveModel(owner);
    markRuntimeRequestStart(provider, modelId);

    const primaryResult = await runPrimaryProvider(provider, {
      ...request,
      modelId,
    });

    const finalResult = await resolveTextProviderFallback(
      primaryResult,
      {
        prompt: request.prompt,
        messages: request.messages,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        timeout: request.timeout,
        modelId,
      },
      config,
    );

    if (!finalResult.success) {
      const errorMessage = finalResult.error || 'Internal text generation failed.';
      markRuntimeRequestError(errorMessage);
      markLockDegraded(owner, errorMessage);
      return finalResult;
    }

    markInferenceReady(owner, config.lockTimeoutMs);
    markRuntimeRequestSuccess(Date.now() - startedAt);

    maybeUnloadByIdlePolicy(config.model.unloadIdleMs);
    return finalResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal text runtime failed unexpectedly.';
    markRuntimeRequestError(message);
    markLockDegraded(owner, message);

    return {
      success: false,
      provider,
      model: modelId,
      usedFallback: false,
      code: 'runtime_error',
      error: message,
    };
  } finally {
    unlockHeavyModel(owner);
  }
}

export async function getUnifiedInternalTextRuntimeStatus(): Promise<InternalTextRuntimeStatus> {
  const config = getInternalTextRuntimeConfig();
  setRuntimeEnabled(config.enabled);

  const baseStatus = getInternalTextRuntimeStatus();
  const snapshot = await getGemmaInternalRuntimeSnapshot();
  const merged = mergeGemmaRuntimeIntoUnifiedStatus(baseStatus, snapshot);

  return {
    ...merged,
    enabled: config.enabled,
  };
}
