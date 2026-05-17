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

// --- Aillame Nano Safe Tools Types ---
export type AillameToolRiskLevel = 'safe' | 'confirm_required' | 'blocked';

export type AillameToolContext = {
  sessionUserId?: string;
  projectPath?: string;
};

export type AillameToolResult = {
  ok: boolean;
  data?: any;
  message?: string;
  errors?: string[];
  warnings?: string[];
};

export type AillameToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: 'memory' | 'system' | 'project' | 'health' | 'ai' | 'distillation';
  riskLevel: AillameToolRiskLevel;
  requiresUserConfirmation: boolean;
  inputSchema: unknown;
  execute: (input: any, context: AillameToolContext) => Promise<AillameToolResult>;
};
