import type { ExternalApiMode } from '@core/external-api/types';

export type ToolName =
  | 'webResearch'
  | 'researchResultCreate'
  | 'qwenText'
  | 'sdxlImage'
  | 'visionAnalyze'
  | 'memoryRead'
  | 'memoryCandidateCreate'
  | 'externalGenerate'
  | 'codeAnalyzer'
  | 'testRunner'
  | 'logAnalyzer';

export type ToolCategory =
  | 'research'
  | 'model'
  | 'memory'
  | 'code'
  | 'testing'
  | 'external'
  | 'system';

export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ToolExecutionPolicy =
  | 'planning_only'
  | 'manual_approval_required'
  | 'safe_auto_allowed'
  | 'disabled';

export type ToolDefinition = {
  name: ToolName;
  displayName: string;
  description: string;
  category: ToolCategory;
  riskLevel: ToolRiskLevel;
  executionPolicy: ToolExecutionPolicy;
  implemented: boolean;
  enabled: boolean;
  requiresApproval: boolean;
  allowedProjectIds?: string[];
  allowedModes?: ExternalApiMode[];
  inputSchemaDescription?: string;
  outputSchemaDescription?: string;
  safetyNotes?: string;
  createdAt: number;
  updatedAt: number;
};

export type ToolRegistryEntry = ToolDefinition & {
  allowed?: boolean;
};

export type ToolListResult = {
  success: true;
  tools: ToolRegistryEntry[];
};
