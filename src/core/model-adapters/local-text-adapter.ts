import type { ImageAttachment } from '@apptypes/attachments';
import { PRO_CHAT_MODEL_ID, type ModelCapability } from '@core/models/registry';
import type {
  AdapterMetadata,
  ModelAdapter,
  ModelAdapterResult,
  TextGenerationAdapterInput,
} from './base';
import { createAdapterErrorResult } from './base';

type LocalTextApiResponse = {
  response?: string;
  modelId?: string;
  repoId?: string;
  engine?: string;
  error?: string;
};

type LocalTextAdapterMetadata = AdapterMetadata & {
  endpoint: string;
  imageCount: number;
  repoId?: string;
  engine?: string;
};

export type LocalTextAdapterOptions = {
  endpoint?: string;
};

function getImageCount(images?: ImageAttachment[]): number {
  return images?.length ?? 0;
}

/**
 * Compatibility adapter for the current external HTTP text endpoint.
 * It is named LocalTextAdapter for existing imports, but it does not run a
 * native local model by itself. A future true local runtime adapter should live
 * beside this endpoint adapter instead of replacing its contract abruptly.
 */
export class LocalTextAdapter implements ModelAdapter<TextGenerationAdapterInput, LocalTextAdapterMetadata> {
  adapterId = 'local-text' as const;
  displayName = 'Aillame External Text Endpoint Adapter';
  capabilities: ModelCapability[] = ['text-generation', 'vision-image-understanding', 'multimodal-input'];

  private readonly endpoint: string;

  constructor(options: LocalTextAdapterOptions = {}) {
    this.endpoint = options.endpoint ?? '/api/core/pro-chat';
  }

  async invoke(input: TextGenerationAdapterInput): Promise<ModelAdapterResult<LocalTextAdapterMetadata>> {
    const imageCount = getImageCount(input.images);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input.prompt,
          images: input.images ?? [],
          modelId: PRO_CHAT_MODEL_ID,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
        }),
        signal: input.signal,
      });

      const payload = await response.json().catch((): LocalTextApiResponse => ({}));
      const usedModelIds = [payload.modelId ?? PRO_CHAT_MODEL_ID];

      if (!response.ok) {
        return createAdapterErrorResult<LocalTextAdapterMetadata>({
          code: 'LOCAL_TEXT_REQUEST_FAILED',
          message: payload.error ?? 'Local text adapter request failed.',
          reason: payload.error ?? 'Local text model returned an error.',
          retryable: true,
          usedModelIds,
          metadata: {
            endpoint: this.endpoint,
            imageCount,
            repoId: payload.repoId,
            engine: payload.engine,
          },
        });
      }

      return {
        success: true,
        content: payload.response ?? '',
        usedModelIds,
        metadata: {
          endpoint: this.endpoint,
          imageCount,
          repoId: payload.repoId,
          engine: payload.engine,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Local text adapter failed.';
      return createAdapterErrorResult<LocalTextAdapterMetadata>({
        code: 'LOCAL_TEXT_ADAPTER_EXCEPTION',
        message,
        reason: 'Local text adapter could not complete the request.',
        retryable: true,
        usedModelIds: [PRO_CHAT_MODEL_ID],
        metadata: {
          endpoint: this.endpoint,
          imageCount,
        },
      });
    }
  }
}
