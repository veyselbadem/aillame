export type ProviderApiTaskType = 'analysis' | 'chat' | 'code' | 'finance' | 'general' | 'image';

export type ProviderApiTextRequest = {
  projectId: string;
  mode: 'text';
  taskType?: ProviderApiTaskType;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  prompt?: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
};

export type ProviderApiImageRequest = {
  projectId: string;
  mode: 'image';
  prompt: string;
  options?: {
    width?: number;
    height?: number;
    steps?: number;
    seed?: number;
  };
};

export type ProviderApiRequest = ProviderApiTextRequest | ProviderApiImageRequest;

export type ProviderApiResponse = {
  success: true;
  provider: 'aillame-local';
  projectId: string;
  mode: 'text' | 'image';
  runtime: {
    type: 'llm' | 'igm';
    local: true;
    modelId: string;
    device: string;
    degraded: boolean;
    placeholderUsed: boolean;
  };
  output: {
    text?: string;
    imageUrl?: string;
    assetId?: string;
    path?: string;
  };
  diagnostics: {
    finalAcceptanceReady: boolean;
    reason: string;
  };
};

export type ProviderApiErrorResponse = {
  success: false;
  error: {
    code: 'INVALID_REQUEST' | 'UNAUTHORIZED' | 'RUNTIME_NOT_READY' | 'GENERATION_FAILED';
    message: string;
    details?: string;
  };
};
