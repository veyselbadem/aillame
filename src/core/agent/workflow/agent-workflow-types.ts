import type { AillameWorkspaceAnalysisReport } from "../workspace/workspace-types";
import type { AillameProblemAnalysisResult } from "../problem/problem-types";
import type { AillamePatchPlanResult } from "../patch-planner/patch-plan-types";
import type { AillameCommandPlanResult } from "../command-runner/command-types";
import type { AillameLearningMemorySearchResult } from "../../memory/learning/learning-memory-types";

export type AillameDiagnosticWorkflowInput = {
  projectId?: string;
  rootPath?: string;
  userMessage?: string;
  logText?: string;
  command?: string;
  includeWorkspaceScan?: boolean;
  includeMemoryRecall?: boolean;
  includePatchPlan?: boolean;
  includeCommandPlan?: boolean;
  metadata?: Record<string, unknown>;
};

export type AillameDiagnosticWorkflowResult = {
  success: boolean;
  mode: "read-only-diagnostic";
  projectId: string;
  summary: string;
  workspace?: AillameWorkspaceAnalysisReport;
  problem?: AillameProblemAnalysisResult;
  memoryRecall?: AillameLearningMemorySearchResult;
  patchPlan?: AillamePatchPlanResult;
  commandPlan?: AillameCommandPlanResult;
  finalRecommendations: string[];
  safetyNotes: string[];
  blockedActions: string[];
  diagnostics: {
    workspaceScanned: boolean;
    problemAnalyzed: boolean;
    memorySearched: boolean;
    patchPlanned: boolean;
    commandPlanned: boolean;
  };
};
