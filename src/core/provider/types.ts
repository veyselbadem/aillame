import type { ApiClient } from '@core/api-clients/types';
import type { ExternalApiMode } from '@core/external-api/types';

export type ProviderMode = ExternalApiMode;

export type ProviderTaskType =
  | 'generate_text'
  | 'generate_news_draft'
  | 'suggest_game_embeds'
  | 'analyze_news';

export type ProviderOutputType = 'text' | 'article' | 'embed_list' | 'embed_item' | 'analysis_plan';

export type ProviderSafetyFlags = Record<string, boolean | string>;

export type ProviderGenerateRequest = {
  projectId: string;
  task: ProviderTaskType;
  mode?: ProviderMode;
  language?: string;
  input?: string;
  context?: Record<string, unknown>;
  outputFormat?: 'text' | 'structured' | 'json';
  metadata?: Record<string, unknown>;
};

export type ProviderRoutingMetadata = {
  clientId: string;
  projectId: string;
  mode: ProviderMode;
  task: ProviderTaskType;
  language: string;
  outputFormat: 'text' | 'structured' | 'json';
  createdAt: string;
  executionMode: 'planning_only' | 'model_execution';
  modelExecution: false;
  memoryWrite: false;
};

export type ProviderBaseOutput = {
  type: ProviderOutputType;
  summary: string;
  warnings: string[];
};

export type ProviderTextOutput = ProviderBaseOutput & {
  type: 'text';
  content: string;
};

export type ProviderArticleOutput = ProviderBaseOutput & {
  type: 'article';
  title: string;
  content: string;
  category: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
};

export type ProviderEmbedItem = {
  title: string;
  description: string;
  category: string;
  embedUrl: string;
  tags: string[];
};

export type ProviderEmbedItemOutput = ProviderBaseOutput & ProviderEmbedItem & {
  type: 'embed_item';
};

export type ProviderEmbedListOutput = ProviderBaseOutput & {
  type: 'embed_list';
  items: ProviderEmbedItem[];
};

export type ProviderAnalysisPlanOutput = ProviderBaseOutput & {
  type: 'analysis_plan';
  requiredResearch: boolean;
  nextSteps: string[];
};

export type ProviderOutput =
  | ProviderTextOutput
  | ProviderArticleOutput
  | ProviderEmbedListOutput
  | ProviderEmbedItemOutput
  | ProviderAnalysisPlanOutput;

export type ProviderGenerateSuccessResponse = {
  success: true;
  provider: 'aillame';
  clientId: string;
  projectId: string;
  mode: ProviderMode;
  task: ProviderTaskType;
  outputFormat: 'text' | 'structured' | 'json';
  output: ProviderOutput | ProviderOutput[];
  metadata: ProviderRoutingMetadata;
  safetyFlags: ProviderSafetyFlags;
  warnings: string[];
};

export type ProviderGenerateErrorResponse = {
  success: false;
  provider: 'aillame';
  error: string;
};

export type ProviderGenerateResponse =
  | ProviderGenerateSuccessResponse
  | ProviderGenerateErrorResponse;

export type ProviderClient = Omit<ApiClient, 'apiKeyHash'>;
