// ============================================================
// Aillame Model Registry (FAZ 2 — extended schema)
// ============================================================
// Types are defined in ./types.ts and re-exported here for
// full backward compatibility with all existing consumers.
// ============================================================

export type {
  AillameTier,
  ModelType,
  ModelRuntime,
  ModelCapability,
  ManagedModel,
  ModelStatusValue,
  ModelWithStatus,
} from './types';

import type { AillameTier, ModelRuntime, ModelCapability, ManagedModel } from './types';

// ---- Model ID constants ----------------------------------------
export const NANO_CHAT_MODEL_ID = 'aillame-nano-v1';
export const PRO_CHAT_MODEL_ID = 'qwen3-vl-8b-instruct';
export const PRO_IMAGE_MODEL_ID = 'sdxl-base-1.0';
export const INTERNAL_TEXT_GGUF_MODEL_ID = 'internal-text-gemma-gguf';
export const OLLAMA_TEXT_MODEL_ID = 'ollama-text-default';
export const AILLAME_NANO_MODEL_ID = NANO_CHAT_MODEL_ID;

// ---- Central model registry ------------------------------------
export const MODEL_REGISTRY: Record<string, ManagedModel> = {
  [NANO_CHAT_MODEL_ID]: {
    id: NANO_CHAT_MODEL_ID,
    displayName: 'Aillame Nano',
    label: 'Aillame Nano',
    shortLabel: 'Nano',
    tier: 'nano',
    purpose: 'chat',
    type: 'text',
    family: 'nano',
    runtime: 'rust-candle',
    sizeLabel: 'Embedded local checkpoint',
    capabilities: ['text-generation', 'chat'],
    description: 'Fast local text chat through the Rust/Candle Nano engine.',
    installHint: 'Bundled with the app.',
    builtIn: true,
    enabled: true,
    experimental: false,
    defaultForModes: ['fast'],
    recommendedRamGb: 1,
    recommendedVramGb: 0,
  },
  [PRO_CHAT_MODEL_ID]: {
    id: PRO_CHAT_MODEL_ID,
    displayName: 'Qwen3-VL 8B Instruct',
    label: 'Qwen3-VL 8B Instruct',
    shortLabel: 'Qwen3-VL 8B',
    tier: 'pro',
    purpose: 'chat',
    type: 'multimodal',
    family: 'qwen',
    repoId: 'Qwen/Qwen3-VL-8B-Instruct',
    runtime: 'python-transformers',
    sizeLabel: '8B parameters',
    licenseLabel: 'Apache-2.0',
    capabilities: [
      'text-generation',
      'chat',
      'vision',
      'multimodal',
      'vision-image-understanding',
      'multimodal-input',
    ],
    description: 'Primary Pro model for advanced chat, image understanding, OCR, and multimodal reasoning.',
    installHint: 'Downloaded from Hugging Face by the Python Transformers runner.',
    parameterSize: '8B',
    contextSize: 8192,
    recommendedRamGb: 16,
    recommendedVramGb: 8,
    enabled: false,
    experimental: false,
    defaultForModes: ['vision', 'multimodal'],
  },
  [PRO_IMAGE_MODEL_ID]: {
    id: PRO_IMAGE_MODEL_ID,
    displayName: 'Stable Diffusion XL Base 1.0',
    label: 'Stable Diffusion XL Base 1.0',
    shortLabel: 'SDXL Base',
    tier: 'pro',
    purpose: 'image-generation',
    type: 'image',
    family: 'sdxl',
    repoId: 'stabilityai/stable-diffusion-xl-base-1.0',
    runtime: 'python-diffusers',
    sizeLabel: 'SDXL base pipeline',
    licenseLabel: 'OpenRAIL++',
    capabilities: ['image-generation'],
    description: 'Local Pro text-to-image generation model powered by Diffusers.',
    installHint: 'Downloaded from Hugging Face by the Python Diffusers runner.',
    recommendedRamGb: 16,
    recommendedVramGb: 6,
    modelRootEnv: 'AILLAME_IMAGE_MODEL_ROOT',
    enabled: false,
    experimental: true,
  },
  [INTERNAL_TEXT_GGUF_MODEL_ID]: {
    id: INTERNAL_TEXT_GGUF_MODEL_ID,
    displayName: 'Internal Text Runtime - Gemma GGUF',
    label: 'Internal Text Gemma GGUF',
    shortLabel: 'Internal GGUF',
    tier: 'nano',
    purpose: 'chat',
    type: 'text',
    family: 'gemma',
    repoId: 'ggml-org/gemma-4-E4B-it-GGUF',
    filename: 'gemma-4-E4B-it-Q4_K_M.gguf',
    runtime: 'internal-text',
    sizeLabel: 'GGUF Q4_K_M',
    licenseLabel: 'Gemma Terms',
    capabilities: ['text-generation', 'chat', 'instruct'],
    description: 'Unified internal text runtime default - served via llama-server GGUF path.',
    installHint: 'Set AILLAME_INTERNAL_TEXT_MODEL_PATH to the GGUF file and enable internal text runtime.',
    internalTextProvider: 'gguf',
    modelPathEnv: 'AILLAME_INTERNAL_TEXT_MODEL_PATH',
    localPathEnv: 'AILLAME_INTERNAL_TEXT_MODEL_PATH',
    quantization: 'Q4_K_M',
    parameterSize: '4B',
    contextSize: 8192,
    recommendedRamGb: 8,
    recommendedVramGb: 0,
    enabled: true,
    experimental: false,
    defaultForModes: ['general', 'code'],
  },
  [OLLAMA_TEXT_MODEL_ID]: {
    id: OLLAMA_TEXT_MODEL_ID,
    displayName: 'Ollama Text (default)',
    label: 'Ollama Text Default',
    shortLabel: 'Ollama',
    tier: 'nano',
    purpose: 'chat',
    type: 'text',
    family: 'ollama',
    runtime: 'ollama',
    sizeLabel: 'Depends on pulled model',
    capabilities: ['text-generation', 'chat', 'instruct'],
    description: 'Fallback text provider via local Ollama server.',
    installHint: 'Install Ollama and run: ollama pull <model>',
    externalModelId: 'gemma:2b',
    recommendedRamGb: 4,
    recommendedVramGb: 0,
    enabled: true,
    experimental: false,
    defaultForModes: ['fast-fallback'],
  },
};

// ---- Default selectors (backward compat) -----------------------
export const DEFAULT_CHAT_MODEL_BY_TIER: Record<AillameTier, string> = {
  nano: NANO_CHAT_MODEL_ID,
  pro: PRO_CHAT_MODEL_ID,
};

export const DEFAULT_IMAGE_GENERATION_MODEL_ID = PRO_IMAGE_MODEL_ID;

// ---- Helpers (FAZ 1 unchanged) ---------------------------------

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

// ---- Helpers (FAZ 2 new) ----------------------------------------

export function getAllModels(): ManagedModel[] {
  return Object.values(MODEL_REGISTRY);
}

export function getModelsByType(type: ManagedModel['type']): ManagedModel[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.type === type);
}

export function getModelsByRuntime(runtime: ModelRuntime): ManagedModel[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.runtime === runtime);
}

export function getEnabledModels(): ManagedModel[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.enabled !== false);
}

export function getModelById(id: string): ManagedModel | undefined {
  return MODEL_REGISTRY[id];
}

export function listModels(): ManagedModel[] {
  return Object.values(MODEL_REGISTRY);
}

function isUsableModel(model: ManagedModel): boolean {
  return model.enabled !== false;
}

function hasCapabilities(
  model: ManagedModel,
  capabilities: readonly ModelCapability[]
): boolean {
  return capabilities.every((capability) => model.capabilities.includes(capability as any));
}

export function findBestModelForCapabilities(
  capabilities: readonly ModelCapability[],
  preferredModelId?: string
): ManagedModel | undefined {
  if (preferredModelId) {
    const preferredModel = getModelById(preferredModelId);
    if (preferredModel && isUsableModel(preferredModel) && hasCapabilities(preferredModel, capabilities)) {
      return preferredModel;
    }
  }

  return Object.values(MODEL_REGISTRY)
    .filter((model) => isUsableModel(model) && hasCapabilities(model, capabilities))
    .sort((a, b) => {
        // Priority logic: nano < pro
        const tierScore = (m: ManagedModel) => m.tier === 'pro' ? 2 : 1;
        return tierScore(b) - tierScore(a);
    })[0];
}

// ---- Backward-compat helpers (used by ChatShell etc.) ----------

export function modelSupports(modelId: string, capability: ModelCapability): boolean {
  return Boolean(MODEL_REGISTRY[modelId]?.capabilities.includes(capability));
}

export function getChatModelForTier(tier: AillameTier): ManagedModel {
  return getModel(DEFAULT_CHAT_MODEL_BY_TIER[tier]);
}