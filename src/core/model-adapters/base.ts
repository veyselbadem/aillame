import type { ImageAttachment } from '@apptypes/attachments';
import type { ImageGenerationRequest } from '@core/image-generation/types';
import type { ModelCapability } from '@core/models/registry';

export type ModelAdapterId =
  | 'qwen-text'
  | 'sdxl-image'
  | 'local-text'
  | 'local-image'
  | 'vision-placeholder';

export type AdapterMetadataValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | AdapterMetadataValue[]
  | { [key: string]: AdapterMetadataValue };

export type AdapterMetadata = Record<string, AdapterMetadataValue>;

export type AdapterArtifactKind = 'image' | 'text' | 'json';

export type AdapterArtifact = {
  kind: AdapterArtifactKind;
  label?: string;
  mimeType?: string;
  data?: string;
  metadata?: AdapterMetadata;
};

export type AdapterError = {
  code: string;
  message: string;
  retryable: boolean;
  details?: string;
};

export type AdapterSuccessResult<TMetadata extends AdapterMetadata = AdapterMetadata> = {
  success: true;
  content?: string;
  artifacts?: AdapterArtifact[];
  usedModelIds: string[];
  metadata?: TMetadata;
};

export type AdapterErrorResult<TMetadata extends AdapterMetadata = AdapterMetadata> = {
  success: false;
  reason: string;
  errorCode: string;
  error: AdapterError;
  content?: string;
  artifacts?: AdapterArtifact[];
  usedModelIds: string[];
  metadata?: TMetadata;
};

export type ModelAdapterResult<TMetadata extends AdapterMetadata = AdapterMetadata> =
  | AdapterSuccessResult<TMetadata>
  | AdapterErrorResult<TMetadata>;

export type TextGenerationAdapterInput = {
  prompt: string;
  images?: ImageAttachment[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export type ImageGenerationAdapterInput = ImageGenerationRequest & {
  signal?: AbortSignal;
};

export type VisionAdapterInput = {
  prompt?: string;
  images: ImageAttachment[];
  signal?: AbortSignal;
};

export interface ModelAdapter<TInput, TMetadata extends AdapterMetadata = AdapterMetadata> {
  adapterId: ModelAdapterId;
  displayName: string;
  capabilities: ModelCapability[];
  invoke(input: TInput): Promise<ModelAdapterResult<TMetadata>>;
}

export function createAdapterErrorResult<TMetadata extends AdapterMetadata = AdapterMetadata>(
  params: {
    code: string;
    message: string;
    reason?: string;
    retryable?: boolean;
    details?: string;
    usedModelIds?: string[];
    metadata?: TMetadata;
  }
): AdapterErrorResult<TMetadata> {
  return {
    success: false,
    reason: params.reason ?? params.message,
    errorCode: params.code,
    error: {
      code: params.code,
      message: params.message,
      retryable: params.retryable ?? false,
      details: params.details,
    },
    usedModelIds: params.usedModelIds ?? [],
    metadata: params.metadata,
  };
}
