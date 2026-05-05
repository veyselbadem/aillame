export type RuntimeFallbackProvider = 'gemma' | 'ollama' | 'gguf' | 'nano';

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
