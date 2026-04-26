import type { ImageAttachment } from '@apptypes/attachments';
import { PRO_CHAT_MODEL_ID, type ModelCapability } from '@core/models/registry';
import type {
  AdapterMetadata,
  ModelAdapter,
  ModelAdapterResult,
  TextGenerationAdapterInput,
} from './base';
import { createAdapterErrorResult } from './base';

type QwenApiResponse = {
  response?: string;
  modelId?: string;
  repoId?: string;
  engine?: string;
  error?: string;
};

type QwenAdapterMetadata = AdapterMetadata & {
  endpoint: string;
  imageCount: number;
  repoId?: string;
  engine?: string;
};

export type QwenTextAdapterOptions = {
  endpoint?: string;
};

function getImageCount(images?: ImageAttachment[]): number {
  return images?.length ?? 0;
}

export class QwenTextAdapter implements ModelAdapter<TextGenerationAdapterInput, QwenAdapterMetadata> {
  adapterId = 'qwen-text' as const;
  displayName = 'Aillame Qwen Adapter';
  capabilities: ModelCapability[] = ['text-generation', 'vision-image-understanding', 'multimodal-input'];

  private readonly endpoint: string;

  constructor(options: QwenTextAdapterOptions = {}) {
    this.endpoint = options.endpoint ?? '/api/core/pro-chat';
  }

  async invoke(input: TextGenerationAdapterInput): Promise<ModelAdapterResult<QwenAdapterMetadata>> {
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

      const payload = await response.json().catch((): QwenApiResponse => ({}));
      const usedModelIds = [payload.modelId ?? PRO_CHAT_MODEL_ID];

      if (!response.ok) {
        return createAdapterErrorResult<QwenAdapterMetadata>({
          code: 'QWEN_REQUEST_FAILED',
          message: payload.error ?? 'Qwen adapter request failed.',
          reason: payload.error ?? 'Qwen model returned an error.',
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
      const message = error instanceof Error ? error.message : 'Qwen adapter failed.';
      return createAdapterErrorResult<QwenAdapterMetadata>({
        code: 'QWEN_ADAPTER_EXCEPTION',
        message,
        reason: 'Qwen adapter could not complete the request.',
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
