import { AillameMode } from './project.types';
import { AillameFormattedStep, AillameSuggestedFile, AillameFormattedWarning } from './response-formatter.types';
import { AillameSafetyIssue, AillameSafetyRiskLevel } from './safety.types';

export interface AillameChatContextFile {
  path: string;
  content: string;
  language?: string;
}

export interface AillameChatContext {
  taskType?: string;
  agentRole?: string;
  source?: string;
  framework?: string;
  files?: AillameChatContextFile[];
  metadata?: Record<string, unknown>;
}

export interface AillameChatRequest {
  projectId: string;
  mode?: AillameMode;
  message: string;
  context?: AillameChatContext;
}

export interface AillameChatResponse {
  success: true;
  answer: string;
  summary?: string;
  projectId: string;
  mode: AillameMode;
  model: {
    provider: "aillame-local";
    name: string;
  };
  suggestedFiles: AillameSuggestedFile[];
  steps: AillameFormattedStep[];
  warnings?: AillameFormattedWarning[];
  safety: {
    requiresUserApproval: boolean;
    canAutoApply: false;
    riskLevel: AillameSafetyRiskLevel;
    issues: AillameSafetyIssue[];
  };
  meta: {
    requestId: string;
    taskType?: string;
    source?: string;
    mock: boolean;
    [key: string]: any;
  };
}
