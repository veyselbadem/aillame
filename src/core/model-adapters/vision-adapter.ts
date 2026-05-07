import { type ModelCapability } from '@core/models/registry';
import type {
  AdapterMetadata,
  ModelAdapter,
  ModelAdapterResult,
  VisionAdapterInput,
} from './base';
import { createAdapterErrorResult } from './base';

type VisionPlaceholderMetadata = AdapterMetadata & {
  reason: 'vision model not configured';
  imageCount: number;
};

export class VisionAdapter implements ModelAdapter<VisionAdapterInput, VisionPlaceholderMetadata> {
  adapterId = 'vision-placeholder' as const;
  displayName = 'Aillame Vision Placeholder';
  capabilities: ModelCapability[] = ['vision-image-understanding', 'multimodal-input'];

  async invoke(input: VisionAdapterInput): Promise<ModelAdapterResult<VisionPlaceholderMetadata>> {
    return createAdapterErrorResult<VisionPlaceholderMetadata>({
      code: 'VISION_MODEL_NOT_CONFIGURED',
      message: 'Vision model not configured.',
      reason: 'vision model not configured',
      retryable: false,
      usedModelIds: [],
      metadata: {
        reason: 'vision model not configured',
        imageCount: input.images.length,
      },
    });
  }
}
