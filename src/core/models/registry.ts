export type AillameTier = 'nano' | 'pro';

export type ModelCapability =
  | 'text-generation'
  | 'vision-image-understanding'
  | 'multimodal-input'
  | 'image-generation';

export type ModelRuntime =
  | 'rust-candle'
  | 'python-transformers'
  | 'python-diffusers'
  | 'browser-indexeddb'
  | 'llama-server-gguf';

export type ManagedModel = {
  id: string;
  label: string;
  shortLabel: string;
  tier: AillameTier;
  purpose: 'chat' | 'image-generation';
  repoId?: string;
  filename?: string;
  runtime: ModelRuntime;
  sizeLabel: string;
  licenseLabel?: string;
  capabilities: ModelCapability[];
  description: string;
  installHint: string;
  builtIn?: boolean;
  internalTextProvider?: 'gguf' | 'gemma' | 'ollama';
  modelPathEnv?: string;
  recommendedRamGb?: number;
};

export const NANO_CHAT_MODEL_ID = 'aillame-nano-v1';
export const PRO_CHAT_MODEL_ID = 'qwen3-vl-8b-instruct';
export const PRO_IMAGE_MODEL_ID = 'sdxl-base-1.0';
export const INTERNAL_TEXT_GGUF_MODEL_ID = 'internal-text-gemma-gguf';

export const MODEL_REGISTRY: Record<string, ManagedModel> = {
  [NANO_CHAT_MODEL_ID]: {
    id: NANO_CHAT_MODEL_ID,
    label: 'Aillame Nano',
    shortLabel: 'Nano',
    tier: 'nano',
    purpose: 'chat',
    runtime: 'rust-candle',
    sizeLabel: 'Embedded local checkpoint',
    capabilities: ['text-generation'],
    description: 'Fast local text chat through the existing Rust/Candle Nano core.',
    installHint: 'Bundled with the app.',
    builtIn: true,
  },
  [PRO_CHAT_MODEL_ID]: {
    id: PRO_CHAT_MODEL_ID,
    label: 'Qwen3-VL 8B Instruct',
    shortLabel: 'Qwen3-VL 8B',
    tier: 'pro',
    purpose: 'chat',
    repoId: 'Qwen/Qwen3-VL-8B-Instruct',
    runtime: 'python-transformers',
    sizeLabel: '8B parameters',
    licenseLabel: 'Apache-2.0',
    capabilities: ['text-generation', 'vision-image-understanding', 'multimodal-input'],
    description: 'Primary Pro model for advanced chat, image understanding, OCR, and multimodal reasoning.',
    installHint: 'Downloaded from Hugging Face by the Python Transformers runner.',
  },
  [PRO_IMAGE_MODEL_ID]: {
    id: PRO_IMAGE_MODEL_ID,
    label: 'Stable Diffusion XL Base 1.0',
    shortLabel: 'SDXL Base',
    tier: 'pro',
    purpose: 'image-generation',
    repoId: 'stabilityai/stable-diffusion-xl-base-1.0',
    runtime: 'python-diffusers',
    sizeLabel: 'SDXL base pipeline',
    licenseLabel: 'OpenRAIL++',
    capabilities: ['image-generation'],
    description: 'Local Pro text-to-image generation model powered by Diffusers.',
    installHint: 'Downloaded from Hugging Face by the Python Diffusers runner.',
  },
  [INTERNAL_TEXT_GGUF_MODEL_ID]: {
    id: INTERNAL_TEXT_GGUF_MODEL_ID,
    label: 'Internal Text Gemma GGUF',
    shortLabel: 'Internal GGUF',
    tier: 'nano',
    purpose: 'chat',
    repoId: 'ggml-org/gemma-4-E4B-it-GGUF',
    filename: 'gemma-4-E4B-it-Q4_K_M.gguf',
    runtime: 'llama-server-gguf',
    sizeLabel: 'GGUF Q4_K_M',
    licenseLabel: 'Gemma Terms',
    capabilities: ['text-generation'],
    description: 'Unified internal text runtime default model served through llama-server GGUF path.',
    installHint: 'Set AILLAME_INTERNAL_TEXT_MODEL_PATH to the GGUF file and enable internal text runtime.',
    internalTextProvider: 'gguf',
    modelPathEnv: 'AILLAME_INTERNAL_TEXT_MODEL_PATH',
    recommendedRamGb: 8,
  },
};

export const DEFAULT_CHAT_MODEL_BY_TIER: Record<AillameTier, string> = {
  nano: NANO_CHAT_MODEL_ID,
  pro: PRO_CHAT_MODEL_ID,
};

export const DEFAULT_IMAGE_GENERATION_MODEL_ID = PRO_IMAGE_MODEL_ID;

export function getModel(modelId: string): ManagedModel {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return model;
}

export function getModelsByPurpose(purpose: ManagedModel['purpose']): ManagedModel[] {
  return Object.values(MODEL_REGISTRY).filter((model) => model.purpose === purpose);
}

export function modelSupports(modelId: string, capability: ModelCapability): boolean {
  return Boolean(MODEL_REGISTRY[modelId]?.capabilities.includes(capability));
}

export function getChatModelForTier(tier: AillameTier): ManagedModel {
  return getModel(DEFAULT_CHAT_MODEL_BY_TIER[tier]);
}
