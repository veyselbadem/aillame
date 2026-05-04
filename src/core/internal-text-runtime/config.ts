import type {
  InternalTextProvider,
  InternalTextRuntimeConfig,
  InternalTextModelConfig,
} from './model-types';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
}

function parseInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeProvider(value: string | undefined, fallback: InternalTextProvider): InternalTextProvider {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'gguf' || normalized === 'gemma' || normalized === 'ollama') {
    return normalized;
  }
  return fallback;
}

function resolveFallbackProvider(value: string | undefined): Extract<InternalTextProvider, 'ollama'> | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'off') {
    return undefined;
  }
  return normalized === 'ollama' ? 'ollama' : undefined;
}

function resolveModelConfig(): InternalTextModelConfig {
  const modelId =
    process.env.AILLAME_TEXT_MODEL_ID
    || process.env.AILLAME_GEMMA_MODEL_ID
    || process.env.AILLAME_GEMMA_GGUF_FILE
    || 'qwen2.5-coder-3b-instruct-q4';

  const modelPath =
    process.env.AILLAME_TEXT_MODEL_PATH
    || process.env.AILLAME_GEMMA_MODEL_PATH
    || '';

  return {
    modelId,
    modelPath,
    contextSize: parseInteger(
      process.env.AILLAME_TEXT_CONTEXT_SIZE || process.env.AILLAME_GEMMA_CONTEXT_SIZE,
      8192,
      1024,
      32768,
    ),
    gpuLayers: parseInteger(process.env.AILLAME_TEXT_GPU_LAYERS, 0, 0, 999),
    maxInputChars: parseInteger(
      process.env.AILLAME_TEXT_MAX_INPUT_CHARS || process.env.AILLAME_GEMMA_MAX_INPUT_CHARS,
      12000,
      1000,
      200000,
    ),
    timeoutMs: parseInteger(
      process.env.AILLAME_TEXT_TIMEOUT_MS || process.env.AILLAME_GEMMA_TIMEOUT_MS,
      60000,
      5000,
      600000,
    ),
    autoStart: parseBoolean(
      process.env.AILLAME_TEXT_AUTO_START || process.env.AILLAME_GEMMA_AUTO_START,
      true,
    ),
    startOnAppBoot: parseBoolean(
      process.env.AILLAME_TEXT_START_ON_APP_BOOT || process.env.AILLAME_GEMMA_START_ON_APP_BOOT,
      false,
    ),
    unloadIdleMs: parseInteger(process.env.AILLAME_TEXT_UNLOAD_IDLE_MS, 300000, 10000, 3600000),
  };
}

export function getInternalTextRuntimeConfig(): InternalTextRuntimeConfig {
  const defaultProvider = normalizeProvider(
    process.env.AILLAME_INTERNAL_TEXT_RUNTIME_DEFAULT_PROVIDER,
    'gguf',
  );

  return {
    enabled: parseBoolean(process.env.AILLAME_INTERNAL_TEXT_RUNTIME_ENABLED, true),
    defaultProvider,
    fallbackProvider: resolveFallbackProvider(process.env.AILLAME_INTERNAL_TEXT_RUNTIME_FALLBACK_PROVIDER),
    allowRemoteFallback: parseBoolean(process.env.AILLAME_INTERNAL_TEXT_RUNTIME_ALLOW_REMOTE_FALLBACK, false),
    singleHeavyModel: parseBoolean(process.env.AILLAME_INTERNAL_TEXT_RUNTIME_SINGLE_HEAVY_MODEL, true),
    lockTimeoutMs: parseInteger(process.env.AILLAME_INTERNAL_TEXT_RUNTIME_LOCK_TIMEOUT_MS, 120000, 30000, 900000),
    model: resolveModelConfig(),
  };
}
