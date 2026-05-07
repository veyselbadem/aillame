import { DEFAULT_IMAGE_GENERATION_MODEL_ID, type ModelCapability } from '@core/models/registry';
import type {
  AdapterMetadata,
  ImageGenerationAdapterInput,
  ModelAdapter,
  ModelAdapterResult,
} from './base';
import { createAdapterErrorResult } from './base';

type LocalImageApiResponse = {
  image?: string;
  mimeType?: 'image/png';
  modelId?: string;
  seed?: number;
  error?: string;
};

type LocalImageAdapterMetadata = AdapterMetadata & {
  endpoint: string;
  width: number | null;
  height: number | null;
  preset: string | null;
  steps: number | null;
  seed: number | null;
};

export type LocalImageAdapterOptions = {
  endpoint?: string;
};

/**
 * Compatibility adapter for the current external HTTP image endpoint.
 * It is named LocalImageAdapter for existing imports, but it does not run a
 * native image model by itself.
 */
export class LocalImageAdapter implements ModelAdapter<ImageGenerationAdapterInput, LocalImageAdapterMetadata> {
  adapterId = 'local-image' as const;
  displayName = 'Aillame External Image Endpoint Adapter';
  capabilities: ModelCapability[] = ['image-generation'];

  private readonly endpoint: string;

  constructor(options: LocalImageAdapterOptions = {}) {
    this.endpoint = options.endpoint ?? '/api/image-generation';
  }

  async invoke(input: ImageGenerationAdapterInput): Promise<ModelAdapterResult<LocalImageAdapterMetadata>> {
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

      const payload = await response.json().catch((): LocalImageApiResponse => ({}));
      const usedModelIds = [payload.modelId ?? DEFAULT_IMAGE_GENERATION_MODEL_ID];

      if (!response.ok || !payload.image) {
        return createAdapterErrorResult<LocalImageAdapterMetadata>({
          code: 'LOCAL_IMAGE_REQUEST_FAILED',
          message: payload.error ?? 'Local image adapter request failed.',
          reason: payload.error ?? 'Local image generation returned no image.',
          retryable: true,
          usedModelIds,
          metadata: {
            endpoint: this.endpoint,
            width: input.width ?? null,
            height: input.height ?? null,
            preset: input.preset ?? null,
            steps: input.steps ?? null,
            seed: payload.seed ?? input.seed ?? null,
          },
        });
      }

      return {
        success: true,
        content: 'Image generated successfully.',
        artifacts: [
          {
            kind: 'image',
            label: 'Local image output',
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
          width: input.width ?? null,
          height: input.height ?? null,
          preset: input.preset ?? null,
          steps: input.steps ?? null,
          seed: payload.seed ?? input.seed ?? null,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Local image adapter failed.';
      return createAdapterErrorResult<LocalImageAdapterMetadata>({
        code: 'LOCAL_IMAGE_ADAPTER_EXCEPTION',
        message,
        reason: 'Local image adapter could not complete the request.',
        retryable: true,
        usedModelIds: [DEFAULT_IMAGE_GENERATION_MODEL_ID],
        metadata: {
          endpoint: this.endpoint,
          width: input.width ?? null,
          height: input.height ?? null,
          preset: input.preset ?? null,
          steps: input.steps ?? null,
          seed: input.seed ?? null,
        },
      });
    }
  }
}
