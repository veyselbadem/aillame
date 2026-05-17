import dotenv from 'dotenv';

dotenv.config({ override: true });

export const RUNTIME_CONFIG = {
  enableRealInference: process.env.AILLAME_ENABLE_REAL_INFERENCE === "true",
  allowMockFallback: process.env.AILLAME_ALLOW_RUNTIME_MOCK_FALLBACK !== "false",
  chatUseRuntime: process.env.AILLAME_CHAT_USE_RUNTIME === "true",
  useGpu: process.env.AILLAME_USE_GPU === "true",
  gpuLayers: Number(process.env.AILLAME_GPU_LAYERS || 10),
  defaultTimeoutMs: Number(process.env.AILLAME_RUNTIME_TIMEOUT_MS || 60000),
  defaultMaxOutputTokens: Number(process.env.AILLAME_MAX_OUTPUT_TOKENS || 512),
  defaultTemperature: Number(process.env.AILLAME_TEMPERATURE || 0.2),
  disableNativeInferenceInDev: process.env.AILLAME_DISABLE_NATIVE_INFERENCE_IN_DEV === "true"
};
