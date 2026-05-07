export type ModelFormat = 'gguf' | 'safetensors' | 'onnx' | 'mlx' | 'pytorch' | 'unknown';
export type ModelSourceProvider = 'huggingface' | 'local-folder' | 'manual' | 'cached' | 'unknown';

export interface DiscoveredModelFile {
  name: string;
  format: ModelFormat;
  sizeBytes?: number;
  quantization?: string;
  parameterSize?: string;
}

export interface DiscoveredModel {
  modelId: string;
  displayName: string;
  source: string; // URL or local path
  provider: ModelSourceProvider;
  tags: string[];
  license?: string;
  updatedAt: number;
  downloads?: number;
  likes?: number;
  files: DiscoveredModelFile[];
  modelCardUrl?: string;
  metadata: Record<string, any>;
  diagnostics: {
    isGguf: boolean;
    hasCompatibleQuant: boolean;
  };
}

export interface ModelDiscoveryResult {
  success: boolean;
  models: DiscoveredModel[];
  source: string;
  timestamp: number;
  diagnostics: {
    offline: boolean;
    scanDurationMs: number;
  };
}
