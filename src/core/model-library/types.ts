export type ModelRuntimeKind =
  | 'gguf'
  | 'ollama'
  | 'safetensors'
  | 'diffusers'
  | 'comfyui'
  | 'unknown';

export type ModelProviderKind =
  | 'gemma'
  | 'ollama'
  | 'aillame'
  | 'sdxl'
  | 'comfyui'
  | 'janus'
  | 'custom';

export type ModelCapability =
  | 'text'
  | 'chat'
  | 'code'
  | 'vision'
  | 'image'
  | 'embedding'
  | 'audio'
  | 'unknown';

export type LocalModelStatus =
  | 'available'
  | 'missing'
  | 'installing'
  | 'failed'
  | 'disabled';

export interface LocalModelMetadata {
  id: string;
  name: string;
  provider: ModelProviderKind;
  runtime: ModelRuntimeKind;
  capabilities: ModelCapability[];
  status: LocalModelStatus;
  source: string;
  localPath?: string;
  fileName?: string;
  sizeBytes?: number;
  quantization?: string;
  contextSize?: number;
  description?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastCheckedAt?: string;
  error?: string;
}

export interface ModelRegistrySnapshot {
  models: LocalModelMetadata[];
  updatedAt: string;
  source: string;
}

export interface LocalModelDiscoveryOptions {
  directories?: string[];
  includeMissing?: boolean;
  maxDepth?: number;
  now?: Date | string;
  allowedExtensions?: string[];
}

export interface ModelInstallRequest {
  modelId: string;
  sourceUrl?: string;
  expectedRuntime?: ModelRuntimeKind;
  targetDirectory?: string;
  dryRun?: boolean;
}

export interface ModelInstallResult {
  ok: boolean;
  installId?: string;
  status: LocalModelStatus;
  message: string;
  model?: LocalModelMetadata;
  supported: boolean;
  reason?: string;
}

export interface ModelRemoveRequest {
  modelId: string;
  dryRun?: boolean;
  confirmDelete?: boolean;
}

export interface ModelRemoveResult {
  ok: boolean;
  dryRun: boolean;
  message: string;
  modelId: string;
}
