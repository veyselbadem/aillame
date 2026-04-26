export type ExternalProjectId = 'boss-ai' | 'doomsgame' | 'doomsgame-engine' | 'egitim-web' | 'aillame-local';

export type ExternalApiMode = 'general' | 'content' | 'code' | 'education' | 'economy' | 'image_generation';

export type ExternalRateLimitProfile = 'low' | 'standard' | 'trusted';

export type ExternalAillameAttachment = {
  id: string;
  type: string;
  filename?: string;
  mimeType?: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

export type ExternalAillameRequest = {
  projectId: ExternalProjectId;
  mode?: ExternalApiMode;
  message: string;
  context?: Record<string, unknown>;
  attachments?: ExternalAillameAttachment[];
  sessionId?: string;
  requestId?: string;
};

export type ExternalResearchType =
  | 'web'
  | 'news'
  | 'economy_news'
  | 'documentation'
  | 'education'
  | 'source_summary';

export type ExternalSourcePolicy = {
  requireCitations: boolean;
  requirePublicationDate: boolean;
  requireMultipleSources: boolean;
  allowedSourceTypes: string[];
  blockedSourceTypes: string[];
  reliabilityScoringRequired: boolean;
};

export type ExternalFreshnessRequirement = {
  timeframe?: string;
  requiresRecentSources: boolean;
  maxAgeDays?: number;
  publicationDateRequired: boolean;
};

export type ExternalCitationPolicy = {
  citationsRequired: boolean;
  sourceUrlRequired: boolean;
  publicationDateRequired: boolean;
  accessedAtRequired: boolean;
};

export type ExternalAdapterName = 'text' | 'image' | 'vision';

export type ExternalAillameResponse = {
  success: boolean;
  answer?: string;
  selectedMode?: ExternalApiMode;
  projectId?: ExternalProjectId;
  usedAdapters?: ExternalAdapterName[];
  memoryScopes?: string[];
  safetyFlags?: Record<string, boolean | string>;
  warnings?: string[];
  taskId?: string | null;
  executionMode?: 'planning_only' | 'model_execution';
  routingPlan?: ExternalRoutingPlan;
  adapterPlan?: ExternalAdapterPlan;
  projectPolicy?: ExternalProjectPolicy;
  normalizedTask?: ExternalNormalizedTask;
  nextActions?: string[];
  error?: string;
};

export type ExternalProjectSafetyRules = {
  financialDisclaimerRequired?: boolean;
  directTradingAdviceAllowed?: boolean;
  directFileWriteAllowed?: boolean;
  directTerminalExecutionAllowed?: boolean;
  educationLevelContextSupported?: boolean;
  localGeneralUse?: boolean;
  economyNewsSafetyRequired?: boolean;
  sourceCitationRequired?: boolean;
  childSafeEducationContentRequired?: boolean;
  documentationSourceRequired?: boolean;
};

export type ExternalRoutingPlan = {
  projectId: ExternalProjectId;
  selectedMode: ExternalApiMode;
  intent: string;
  requiredAdapters: ExternalAdapterName[];
  memoryScopes: string[];
  safetyFlags: Record<string, boolean | string>;
  warnings: string[];
  requiresWebResearch?: boolean;
  researchType?: ExternalResearchType;
  sourcePolicy?: ExternalSourcePolicy;
  freshnessRequirement?: ExternalFreshnessRequirement;
  citationPolicy?: ExternalCitationPolicy;
  contextSummary?: Record<string, string>;
  attachmentSummary?: Array<{
    id: string;
    type: string;
    filename?: string;
    mimeType?: string;
  }>;
};

export type ExternalAdapterPlan = {
  textAdapterRequired: boolean;
  imageAdapterRequired: boolean;
  visionAdapterRequired: boolean;
  webResearchAdapterRequired: boolean;
  newsAnalysisRequired: boolean;
  citationRequired: boolean;
  freshnessCheckRequired: boolean;
  sourceReliabilityCheckRequired: boolean;
  suggestedAdapters: ExternalAdapterName[];
  executionAllowed: false;
  executionBlockedReason: string;
};

export type ExternalProjectPolicy = {
  projectId: ExternalProjectId;
  allowedModes: ExternalApiMode[];
  defaultMode: ExternalApiMode;
  memoryPolicy: ExternalMemoryPolicy;
  safetyRules: ExternalProjectSafetyRules;
};

export type ExternalNormalizedTask = {
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

export type ExternalMemoryPolicy = {
  projectMemory: boolean;
  modeMemory: boolean;
  globalMemory: boolean;
};

export type ExternalProjectConfig = {
  projectId: ExternalProjectId;
  displayName: string;
  allowedModes: ExternalApiMode[];
  defaultMode: ExternalApiMode;
  rateLimitProfile: ExternalRateLimitProfile;
  memoryPolicy: ExternalMemoryPolicy;
};

export type ExternalApiAuthResult = {
  success: boolean;
  projectId?: ExternalProjectId;
  error?: string;
};
