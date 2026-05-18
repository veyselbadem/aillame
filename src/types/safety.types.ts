import { AillameFormattedResponse, AillameSuggestedFile } from './response-formatter.types';

export type AillameSafetyRiskLevel = "none" | "low" | "medium" | "high" | "critical";

export interface AillameSafetyIssue {
  code: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  target?: string;
}

export interface AillameSafetyResult {
  safe: boolean;
  riskLevel: AillameSafetyRiskLevel;
  requiresUserApproval: boolean;
  canAutoApply: false;
  issues: AillameSafetyIssue[];
  blockedSuggestedFiles: AillameSuggestedFile[];
  allowedSuggestedFiles: AillameSuggestedFile[];
  meta: {
    validator: "aillame-safety-v1";
    checkedAt: string;
  };
}

export interface AillameSafetyValidationInput {
  projectId: string;
  mode: string;
  formattedResponse: AillameFormattedResponse;
}
