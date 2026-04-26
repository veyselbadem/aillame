export type ImageSizePreset = 'square' | 'portrait' | 'landscape';

export type ImageGenerationRequest = {
  prompt: string;
  negativePrompt?: string;
  preset?: ImageSizePreset;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
};

export type ImageGenerationResult = {
  image: string;
  mimeType: 'image/png';
  modelId: string;
  seed?: number;
};

export const IMAGE_SIZE_PRESETS: Record<ImageSizePreset, { width: number; height: number; label: string }> = {
  square: { width: 1024, height: 1024, label: 'Square' },
  portrait: { width: 832, height: 1216, label: 'Portrait' },
  landscape: { width: 1216, height: 832, label: 'Landscape' },
};
