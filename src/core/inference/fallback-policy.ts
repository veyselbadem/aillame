export type RuntimeFallbackProvider = 'gemma' | 'ollama' | 'gguf' | 'nano';

// ── Model selection decision (FAZ 11C) ───────────────────────────────────

export type ModelSelectionEventType = 'model_selection' | 'fallback' | 'runtime_error';

export interface ModelSelectionDecision {
  ok: boolean;
  requestedModelId?: string;
  selectedModelId?: string;
  fallbackModelId?: string;
  provider?: string;
  capability?: string;
  reason: string;
  shouldRetryWithFallback: boolean;
  eventType: ModelSelectionEventType;
}

export interface ModelSelectionDecisionInput {
  requestedModelId?: string;
  selectedModelId?: string;
  fallbackModelId?: string;
  provider?: string;
  capability?: string;
  available: boolean;
  reason?: string;
}

export function createRuntimeFallbackDecision(
  input: ModelSelectionDecisionInput,
): ModelSelectionDecision {
  const { requestedModelId, selectedModelId, fallbackModelId, provider, capability, available, reason } = input;

  if (available) {
    return {
      ok: true,
      requestedModelId,
      selectedModelId: selectedModelId ?? requestedModelId,
      provider,
      capability,
      reason: reason ?? 'Requested model is available.',
      shouldRetryWithFallback: false,
      eventType: 'model_selection',
    };
  }

  if (fallbackModelId) {
    return {
      ok: true,
      requestedModelId,
      selectedModelId: fallbackModelId,
      fallbackModelId,
      provider,
      capability,
      reason: reason ?? `Requested model unavailable; using fallback: ${fallbackModelId}`,
      shouldRetryWithFallback: true,
      eventType: 'fallback',
    };
  }

  return {
    ok: false,
    requestedModelId,
    selectedModelId: undefined,
    provider,
    capability,
    reason: reason ?? 'Requested model is unavailable and no fallback is configured.',
    shouldRetryWithFallback: false,
    eventType: 'runtime_error',
  };
}

export function shouldUseFallbackModel(decision: ModelSelectionDecision): boolean {
  return decision.shouldRetryWithFallback && !!decision.fallbackModelId;
}

export function summarizeFallbackDecision(decision: ModelSelectionDecision): string {
  const model = decision.selectedModelId ?? decision.requestedModelId ?? 'unknown';
  const tag = decision.eventType === 'fallback' ? '[fallback]' : decision.eventType === 'runtime_error' ? '[error]' : '[ok]';
  return `${tag} model=${model} reason="${decision.reason}"`;
}

export function createModelSelectionEventFromDecision(
  decision: ModelSelectionDecision,
): {
  type: ModelSelectionEventType;
  provider?: string;
  requestedModelId?: string;
  selectedModelId?: string;
  fallbackModelId?: string;
  capability?: string;
  ok: boolean;
  reason?: string;
  source: string;
} {
  return {
    type: decision.eventType,
    provider: decision.provider,
    requestedModelId: decision.requestedModelId,
    selectedModelId: decision.selectedModelId,
    fallbackModelId: decision.fallbackModelId,
    capability: decision.capability,
    ok: decision.ok,
    reason: decision.reason,
    source: 'fallback-policy',
  };
}

// ── Provider-level fallback (original types preserved) ────────────────────

export interface RuntimeFallbackPolicy {
  enabled: boolean;
  allowRollback: boolean;
  maxFallbackAttempts: number;
  primaryProviders: RuntimeFallbackProvider[];
  fallbackProviders: RuntimeFallbackProvider[];
}

export interface RuntimeFallbackDecision {
  shouldFallback: boolean;
  shouldRollback: boolean;
  reason: string;
  nextProvider?: RuntimeFallbackProvider;
}

export interface RuntimeFallbackInput {
  provider: RuntimeFallbackProvider;
  attempts: number;
  errorCode?: string;
}

export function createDefaultRuntimeFallbackPolicy(): RuntimeFallbackPolicy {
  return {
    enabled: true,
    allowRollback: true,
    maxFallbackAttempts: 2,
    primaryProviders: ['gemma', 'gguf'],
    fallbackProviders: ['ollama', 'nano'],
  };
}

export function evaluateRuntimeFallbackPolicy(
  input: RuntimeFallbackInput,
  policy: RuntimeFallbackPolicy = createDefaultRuntimeFallbackPolicy(),
): RuntimeFallbackDecision {
  if (!policy.enabled) {
    return {
      shouldFallback: false,
      shouldRollback: false,
      reason: 'Fallback policy is disabled.',
    };
  }

  if (input.attempts >= policy.maxFallbackAttempts) {
    return {
      shouldFallback: false,
      shouldRollback: policy.allowRollback,
      reason: 'Max fallback attempts reached.',
    };
  }

  const nextProvider = policy.fallbackProviders.find((p) => p !== input.provider);
  if (!nextProvider) {
    return {
      shouldFallback: false,
      shouldRollback: policy.allowRollback,
      reason: 'No fallback provider available.',
    };
  }

  return {
    shouldFallback: true,
    shouldRollback: false,
    reason: input.errorCode
      ? `Fallback allowed due to error code: ${input.errorCode}`
      : 'Fallback allowed by policy.',
    nextProvider,
  };
}

export function isFallbackPolicyReady(
  policy: RuntimeFallbackPolicy = createDefaultRuntimeFallbackPolicy(),
): boolean {
  return policy.enabled
    && policy.primaryProviders.length > 0
    && policy.fallbackProviders.length > 0
    && policy.maxFallbackAttempts > 0;
}
