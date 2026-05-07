import { analyzeWorkspaceReadOnly } from "../workspace/workspace-analyzer";
import { analyzeProblemReadOnly } from "../problem/problem-analyzer";
import { planPatchReadOnly } from "../patch-planner/patch-planner";
import { planCommandDryRun } from "../command-runner/command-plan";
import { getDefaultLearningMemoryStore, type AillameLearningMemoryStore } from "../../memory/learning/learning-memory-store";
import {
  buildDiagnosticBlockedActions,
  buildDiagnosticFinalRecommendations,
  buildDiagnosticSafetyNotes,
  summarizeDiagnosticWorkflow,
} from "./diagnostic-report";
import type { AillameProblemAnalysisResult } from "../problem/problem-types";
import type { AillameWorkspaceAnalysisReport } from "../workspace/workspace-types";
import type { AillamePatchPlanResult } from "../patch-planner/patch-plan-types";
import type { AillameCommandPlanResult } from "../command-runner/command-types";
import type { AillameLearningMemorySearchResult } from "../../memory/learning/learning-memory-types";
import type { AillameDiagnosticWorkflowInput, AillameDiagnosticWorkflowResult } from "./agent-workflow-types";

export type AillameDiagnosticWorkflowOptions = {
  memoryStore?: AillameLearningMemoryStore;
};

function shouldRun(value: boolean | undefined): boolean {
  return value !== false;
}

function buildMemoryQuery(input: AillameDiagnosticWorkflowInput): string {
  return [input.userMessage, input.logText, input.command].filter(Boolean).join("\n").slice(0, 4000);
}

export function runDiagnosticWorkflowReadOnly(
  input: AillameDiagnosticWorkflowInput,
  options: AillameDiagnosticWorkflowOptions = {}
): AillameDiagnosticWorkflowResult {
  const projectId = input.projectId ?? "default";
  let workspace: AillameWorkspaceAnalysisReport | undefined;
  let problem: AillameProblemAnalysisResult | undefined;
  let memoryRecall: AillameLearningMemorySearchResult | undefined;
  let patchPlan: AillamePatchPlanResult | undefined;
  let commandPlan: AillameCommandPlanResult | undefined;

  if (shouldRun(input.includeWorkspaceScan) && input.rootPath) {
    workspace = analyzeWorkspaceReadOnly({
      rootPath: input.rootPath,
      projectId,
      maxDepth: 4,
      maxFiles: 700,
      includeHidden: false,
    }).report;
  }

  if (input.userMessage || input.logText || input.command) {
    problem = analyzeProblemReadOnly({
      projectId,
      rootPath: input.rootPath,
      projectType: workspace?.projectType,
      userMessage: input.userMessage,
      logText: input.logText,
      command: input.command,
      metadata: input.metadata,
    });
  }

  if (shouldRun(input.includeMemoryRecall)) {
    const store = options.memoryStore ?? getDefaultLearningMemoryStore();
    memoryRecall = store.search({
      projectId,
      query: buildMemoryQuery(input),
      category: problem?.category,
      tags: problem ? [problem.category] : undefined,
      limit: 5,
    });
  }

  if (shouldRun(input.includePatchPlan) && (problem || workspace)) {
    patchPlan = planPatchReadOnly({
      projectId,
      rootPath: input.rootPath,
      userGoal: input.userMessage,
      workspaceReport: workspace,
      problemAnalysis: problem,
      constraints: {
        readOnly: true,
        allowFileWrites: false,
        allowCommandRun: false,
      },
      metadata: input.metadata,
    });
  }

  if (shouldRun(input.includeCommandPlan) && input.command) {
    commandPlan = planCommandDryRun({
      command: input.command,
      rootPath: input.rootPath,
      projectType: workspace?.projectType,
      projectId,
      allowNetwork: false,
      allowInstall: false,
      allowProcessKill: false,
      allowFileDelete: false,
      metadata: input.metadata,
    });
  }

  const partial = { workspace, problem, memoryRecall, patchPlan, commandPlan };

  return {
    success: true,
    mode: "read-only-diagnostic",
    projectId,
    summary: summarizeDiagnosticWorkflow(partial),
    workspace,
    problem,
    memoryRecall,
    patchPlan,
    commandPlan,
    finalRecommendations: buildDiagnosticFinalRecommendations(partial),
    safetyNotes: buildDiagnosticSafetyNotes(partial),
    blockedActions: buildDiagnosticBlockedActions(partial),
    diagnostics: {
      workspaceScanned: Boolean(workspace),
      problemAnalyzed: Boolean(problem),
      memorySearched: Boolean(memoryRecall),
      patchPlanned: Boolean(patchPlan),
      commandPlanned: Boolean(commandPlan),
    },
  };
}
