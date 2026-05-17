import { CapabilityId } from '../../models/capability-types';

/**
 * Aillame Nano Orchestration Contract - Phase E
 */

export type NanoTaskSource = 
  | 'user_chat'
  | 'external_app'
  | 'system_event'
  | 'scheduled_task'
  | 'file_event'
  | 'image_event'
  | 'api_request';

export type NanoTaskLanguage = 'tr' | 'en' | 'mixed' | 'unknown';

export type NanoIntent = 
  | 'chat'
  | 'text_generation'
  | 'code_generation'
  | 'image_generation'
  | 'image_review'
  | 'document_analysis'
  | 'seo_content'
  | 'web_design'
  | 'system_action'
  | 'memory_query'
  | 'safety_review'
  | 'unknown';

export interface NanoAttachment {
  type: 'image' | 'file' | 'audio' | 'url' | 'text';
  assetId: string;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface NanoTaskContext {
  projectId?: string;
  projectType?: string;
  domain?: string;
  userGoal?: string;
  activeModelId?: string;
  availableCapabilities: CapabilityId[];
  memoryRefs?: string[];
}

export interface NanoTaskInput {
  taskId: string;
  source: NanoTaskSource;
  language: NanoTaskLanguage;
  message: string;
  attachments: NanoAttachment[];
  context: NanoTaskContext;
  userPreferences?: Record<string, any>;
  safetyContext?: Record<string, any>;
  createdAt: string;
}

export interface NanoPlanStep {
  stepId: string;
  order: number;
  capability: CapabilityId;
  task: string;
  input?: Record<string, any>;
  expectedOutput?: string;
  modelPreference?: string;
  required: boolean;
  canFallback: boolean;
  timeoutMs: number;
}

export interface NanoOrchestrationPlan {
  planId: string;
  taskId: string;
  intent: NanoIntent;
  requiredCapabilities: CapabilityId[];
  steps: NanoPlanStep[];
  confidence: number; // 0.0 - 1.0
  needsUserApproval: boolean;
  approvalReason?: string;
  fallbackStrategy: 'abort' | 'degrade' | 'retry';
  safetyFlags: string[];
  createdAt: string;
}

export interface NanoDecisionResult {
  success: boolean;
  degraded: boolean;
  intent: NanoIntent;
  plan: NanoOrchestrationPlan;
  selectedCapabilities: CapabilityId[];
  selectedModels: string[]; // Actual model IDs resolved from registry
  confidence: number;
  userMessage?: string; // Standardized summary for the user
  errorCode?: string;
  warnings: string[];
  // internal debug info should NOT be leaked to production clients
  _internalDebug?: {
    reasoning?: string;
    capabilityMisses?: CapabilityId[];
    modelConflicts?: string[];
  };
}

export interface NanoStepResult {
  stepId: string;
  capability: CapabilityId;
  status: 'success' | 'skipped' | 'degraded' | 'failed' | 'blocked';
  selectedModelId?: string;
  fallbackUsed: boolean;
  errorCode?: string;
  message?: string;
  latencyMs: number;
  outputSummary?: string;
  safeForClient: boolean;
}

export interface NanoExecutionSummaryForLearning {
  stepsTotal: number;
  stepsSucceeded: number;
  stepsDegraded: number;
  stepsFailed: number;
  blocked: boolean;
  fallbackUsed: boolean;
  missingCapabilities: CapabilityId[];
  errorCodes: string[];
  latencyMs: number;
}

export interface NanoExecutionResult {
  taskId: string;
  planId: string;
  success: boolean;
  degraded: boolean;
  blocked: boolean;
  steps: NanoStepResult[];
  outputs: Record<string, any>;
  errors: Array<{ stepId: string; code: string; message: string }>;
  latencyMs: number;
  feedbackCandidate: boolean; // Mark for future training data distillation
  executionSummary?: NanoExecutionSummaryForLearning;
}
