import type { AillameProjectIdentity } from "@core/projects/project-identity";
import type { ProjectScanResult } from "../project-scanner/project-scanner-types";

export type CodeAgentTaskType =
  | "analyze"
  | "explain"
  | "edit"
  | "refactor"
  | "test"
  | "build"
  | "fix"
  | "generate-prompt"
  | "project-scan"
  | "unknown";

export type CodeAgentRiskLevel = "low" | "medium" | "high" | "blocked";
export type CodeAgentApprovalRequirement = "none" | "user-approval" | "blocked";

export type CodeAgentStep = {
  id: string;
  title: string;
  description: string;
  actionType: CodeAgentTaskType | "file-read" | "patch-proposal" | "verification" | "safety-check";
  targetFiles?: string[];
  requiresFileRead: boolean;
  requiresFileWrite: boolean;
  requiresCommand: boolean;
  approvalRequired: boolean;
  riskLevel: CodeAgentRiskLevel;
  expectedOutput: string;
};

export type CodeAgentTaskRequest = {
  identity: AillameProjectIdentity;
  rootPath?: string;
  userRequest: string;
  taskType?: CodeAgentTaskType;
  targetFiles?: string[];
  nanoAdvisory?: Record<string, unknown>;
};

export type CodeAgentPlanDiagnostics = {
  advisoryOnly: true;
  selectedTaskType: CodeAgentTaskType;
  highestRisk: CodeAgentRiskLevel;
  approvalRequired: boolean;
  nanoAdvisoryUsed: boolean;
};

export type CodeAgentPlan = {
  success: boolean;
  projectId: string;
  taskType: CodeAgentTaskType;
  summary: string;
  steps: CodeAgentStep[];
  approval: CodeAgentApprovalRequirement;
  riskLevel: CodeAgentRiskLevel;
  diagnostics: CodeAgentPlanDiagnostics;
};

export type CodeAgentTaskResult = {
  success: true;
  projectId: string;
  taskId: string;
  scan?: ProjectScanResult;
  plan: CodeAgentPlan;
  safety: unknown;
  diagnostics: {
    planOnly: true;
    fileWritesEnabled: false;
    commandExecutionEnabled: false;
  };
};
