export type InternalTextProvider = 'gguf' | 'gemma' | 'ollama';

export type HeavyModelLockPhase =
  | 'unlocked'
  | 'loading'
  | 'ready'
  | 'inferencing'
  | 'unloading'
  | 'degraded';

export type RuntimeHealthState = 'healthy' | 'degraded' | 'disabled';

export type HeavyModelOwner = {
  provider: InternalTextProvider;
  modelId: string;
};

export type HeavyModelLockState = {
  phase: HeavyModelLockPhase;
  owner?: HeavyModelOwner;
  leaseUntil?: number;
  lastError?: string;
  updatedAt: number;
};

export type InternalTextModelConfig = {
  modelId: string;
  modelPath: string;
  contextSize: number;
  gpuLayers: number;
  maxInputChars: number;
  timeoutMs: number;
  autoStart: boolean;
  startOnAppBoot: boolean;
  unloadIdleMs: number;
};

export type InternalTextRuntimeConfig = {
  enabled: boolean;
  defaultProvider: InternalTextProvider;
  fallbackProvider?: Extract<InternalTextProvider, 'ollama'>;
  allowRemoteFallback: boolean;
  singleHeavyModel: boolean;
  lockTimeoutMs: number;
  model: InternalTextModelConfig;
};

export type InternalTextRuntimeStatus = {
  enabled: boolean;
  health: RuntimeHealthState;
  activeProvider?: InternalTextProvider;
  activeModelId?: string;
  lock: HeavyModelLockState;
  lastRequestAt?: number;
  lastLatencyMs?: number;
  lastError?: string;
};

export type InternalTextGenerationRequest = {
  prompt: string;
  messages?: Array<{ role?: string; content?: string }>;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  preferredProvider?: InternalTextProvider;
  modelId?: string;
};

export type InternalTextGenerationResponse = {
  success: boolean;
  provider: InternalTextProvider;
  answer?: string;
  model: string;
  usedFallback: boolean;
  code?: string;
  error?: string;
  hint?: string;
};
