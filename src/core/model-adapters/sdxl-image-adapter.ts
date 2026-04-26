import { DEFAULT_IMAGE_GENERATION_MODEL_ID, type ModelCapability } from '@core/models/registry';
import type {
  AdapterMetadata,
  ImageGenerationAdapterInput,
  ModelAdapter,
  ModelAdapterResult,
} from './base';
import { createAdapterErrorResult } from './base';

type SdxlApiResponse = {
  image?: string;
  mimeType?: 'image/png';
  modelId?: string;
  seed?: number;
  error?: string;
};

type SdxlAdapterMetadata = AdapterMetadata & {
  endpoint: string;
  width?: number;
  height?: number;
  preset?: string;
  steps?: number;
  seed?: number;
};

export type SdxlImageAdapterOptions = {
  endpoint?: string;
};

export class SDXLImageAdapter implements ModelAdapter<ImageGenerationAdapterInput, SdxlAdapterMetadata> {
  adapterId = 'sdxl-image' as const;
  displayName = 'Aillame SDXL Adapter';
  capabilities: ModelCapability[] = ['image-generation'];

  private readonly endpoint: string;

  constructor(options: SdxlImageAdapterOptions = {}) {
    this.endpoint = options.endpoint ?? '/api/image-generation';
  }

  async invoke(input: ImageGenerationAdapterInput): Promise<ModelAdapterResult<SdxlAdapterMetadata>> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          preset: input.preset,
          width: input.width,
          height: input.height,
          steps: input.steps,
          seed: input.seed,
        }),
        signal: input.signal,
      });

      const payload = await response.json().catch((): SdxlApiResponse => ({}));
      const usedModelIds = [payload.modelId ?? DEFAULT_IMAGE_GENERATION_MODEL_ID];

      if (!response.ok || !payload.image) {
        return createAdapterErrorResult<SdxlAdapterMetadata>({
          code: 'SDXL_REQUEST_FAILED',
          message: payload.error ?? 'SDXL adapter request failed.',
          reason: payload.error ?? 'SDXL image generation returned no image.',
          retryable: true,
          usedModelIds,
          metadata: {
            endpoint: this.endpoint,
            width: input.width,
            height: input.height,
            preset: input.preset,
            steps: input.steps,
            seed: payload.seed ?? input.seed,
          },
        });
      }

      return {
        success: true,
        content: 'Image generated successfully.',
        artifacts: [
          {
            kind: 'image',
            label: 'SDXL output',
            mimeType: payload.mimeType ?? 'image/png',
            data: payload.image,
            metadata: {
              seed: payload.seed ?? null,
            },
          },
        ],
        usedModelIds,
        metadata: {
          endpoint: this.endpoint,
          width: input.width,
          height: input.height,
          preset: input.preset,
          steps: input.steps,
          seed: payload.seed ?? input.seed,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SDXL adapter failed.';
      return createAdapterErrorResult<SdxlAdapterMetadata>({
        code: 'SDXL_ADAPTER_EXCEPTION',
        message,
        reason: 'SDXL adapter could not complete the request.',
        retryable: true,
        usedModelIds: [DEFAULT_IMAGE_GENERATION_MODEL_ID],
        metadata: {
          endpoint: this.endpoint,
          width: input.width,
          height: input.height,
          preset: input.preset,
          steps: input.steps,
          seed: input.seed,
        },
      });
    }
  }
}
