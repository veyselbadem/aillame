import type { ExternalApiMode } from '@core/external-api/types';

export type ResearchResultStatus = 'draft' | 'reviewed' | 'rejected' | 'archived';

export type ResearchResultType =
  | 'web'
  | 'news'
  | 'economy_news'
  | 'documentation'
  | 'education'
  | 'source_summary';

export type ResearchResultSource = {
  url: string;
  title: string;
  snippet?: string;
  sourceName?: string;
  publishedAt?: number;
  accessedAt: number;
  reliabilityScore?: number;
  citationText?: string;
};

export type ResearchResultSafetyFlags = {
  requiresCitation: boolean;
  requiresFreshnessCheck: boolean;
  requiresFinancialDisclaimer: boolean;
  sourceReliabilityUnknown: boolean;
  shouldNotWriteDirectlyToMemory: boolean;
};

export type ResearchResultNormalizedTask = {
  taskType?: string;
  agentRole?: string;
  assetType?: string;
  symbol?: string;
  symbols?: string[];
  timeframe?: string;
  sourceType?: string;
  query?: string;
  framework?: string;
  documentationTopic?: string;
  classLevel?: string;
  subject?: string;
  topic?: string;
  outputType?: string;
};

export type ResearchResultRecord = {
  id: string;
  projectId: string;
  mode: ExternalApiMode;
  researchType: ResearchResultType;
  query: string;
  normalizedTask?: ResearchResultNormalizedTask;
  sources: ResearchResultSource[];
  summary?: string;
  safetyFlags: ResearchResultSafetyFlags;
  status: ResearchResultStatus;
  createdAt: number;
  updatedAt: number;
  reviewedAt?: number;
  archivedAt?: number;
};

export type CreateResearchResultInput = {
  projectId: string;
  mode: ExternalApiMode;
  researchType: ResearchResultType;
  query: string;
  normalizedTask?: ResearchResultNormalizedTask;
  sources?: ResearchResultSource[];
  summary?: string;
  status?: ResearchResultStatus;
  safetyFlags?: ResearchResultSafetyFlags;
};