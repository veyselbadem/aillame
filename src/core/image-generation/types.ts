export type ImageSizePreset = 'square' | 'landscape' | 'portrait';

export interface ImageSizeDefinition {
  label: string;
  value: string;
  width: number;
  height: number;
}

export const IMAGE_SIZE_PRESETS: Record<ImageSizePreset, ImageSizeDefinition> = {
  square: { label: 'Kare (512x512)', value: '512x512', width: 512, height: 512 },
  landscape: { label: 'Yatay (768x512)', value: '768x512', width: 768, height: 512 },
  portrait: { label: 'Dikey (512x768)', value: '512x768', width: 512, height: 768 },
};

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  preset?: ImageSizePreset;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  metadata?: Record<string, any>;
  requestId?: string;
}

export type ImageJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'not-configured';

export interface ImageJob {
  id: string;
  status: ImageJobStatus;
  outputAssetIds?: string[];
  errorSummary?: string;
}
