import type { AillameWorkspaceAnalysisReport } from "../workspace/workspace-types";
import type { AillameProblemAnalysisResult } from "../problem/problem-types";

export type AillamePatchRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "blocked";

export type AillamePatchPlanInput = {
  projectId?: string;
  rootPath?: string;
  userGoal?: string;
  workspaceReport?: AillameWorkspaceAnalysisReport;
  problemAnalysis?: AillameProblemAnalysisResult;
  constraints?: {
    readOnly?: boolean;
    allowFileWrites?: boolean;
    allowCommandRun?: boolean;
  };
  metadata?: Record<string, unknown>;
};

export type AillamePatchPlanTarget = {
  relativePath: string;
  reason: string;
  expectedChange: string;
  risk: AillamePatchRiskLevel;
  requiresReview: boolean;
};

export type AillamePatchPlanStep = {
  id: string;
  title: string;
  description: string;
  targetFiles: string[];
  risk: AillamePatchRiskLevel;
  blocked: boolean;
  blockReason?: string;
};

export type AillamePatchPlanResult = {
  success: boolean;
  mode: "plan-only";
  summary: string;
  risk: AillamePatchRiskLevel;
  targets: AillamePatchPlanTarget[];
  steps: AillamePatchPlanStep[];
  preChecks: string[];
  postChecks: string[];
  safetyNotes: string[];
  blockedActions: string[];
  readOnly: true;
};
