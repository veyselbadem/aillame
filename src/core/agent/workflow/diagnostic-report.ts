import { buildLearningMemoryRecallNotes } from "../../memory/learning/learning-memory-report";
import type { AillameDiagnosticWorkflowResult } from "./agent-workflow-types";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function summarizeDiagnosticWorkflow(result: Pick<
  AillameDiagnosticWorkflowResult,
  "workspace" | "problem" | "memoryRecall" | "patchPlan" | "commandPlan"
>): string {
  const parts: string[] = [];

  if (result.problem) {
    parts.push(`${result.problem.category} problem detected with ${result.problem.severity} severity`);
  } else {
    parts.push("No problem log was analyzed");
  }

  if (result.workspace) {
    parts.push(`${result.workspace.projectType} workspace context available`);
  }

  if (result.memoryRecall) {
    parts.push(`${result.memoryRecall.total} related memory item(s) recalled`);
  }

  if (result.patchPlan) {
    parts.push(`patch plan risk is ${result.patchPlan.risk}`);
  }

  if (result.commandPlan) {
    parts.push(`command plan is ${result.commandPlan.safety.risk}`);
  }

  return parts.join("; ") + ".";
}

export function buildDiagnosticFinalRecommendations(result: Pick<
  AillameDiagnosticWorkflowResult,
  "workspace" | "problem" | "memoryRecall" | "patchPlan" | "commandPlan"
>): string[] {
  const recommendations: string[] = [];

  recommendations.push(...(result.problem?.recommendedChecks ?? []));
  recommendations.push(...(result.patchPlan?.preChecks ?? []));

  if (result.memoryRecall) {
    recommendations.push(...buildLearningMemoryRecallNotes(result.memoryRecall));
  }

  if (result.commandPlan) {
    recommendations.push(...result.commandPlan.plan);
  }

  if (result.workspace) {
    recommendations.push(...result.workspace.recommendedNextChecks);
  }

  return unique(recommendations).slice(0, 16);
}

export function buildDiagnosticSafetyNotes(result: Pick<
  AillameDiagnosticWorkflowResult,
  "workspace" | "problem" | "patchPlan" | "commandPlan"
>): string[] {
  return unique([
    "Diagnostic workflow is read-only.",
    "No files were written, deleted, renamed, or patched.",
    "No terminal command was executed.",
    "No model training was started.",
    ...(result.workspace?.safety.readOnly ? ["Workspace scan stayed in read-only mode."] : []),
    ...(result.problem?.safetyNotes ?? []),
    ...(result.patchPlan?.safetyNotes ?? []),
    ...(result.commandPlan?.safety.warnings ?? []),
  ]).slice(0, 16);
}

export function buildDiagnosticBlockedActions(result: Pick<
  AillameDiagnosticWorkflowResult,
  "patchPlan" | "commandPlan"
>): string[] {
  return unique([
    "File write",
    "File delete",
    "Patch apply",
    "Terminal command execution",
    "Automatic training",
    ...(result.patchPlan?.blockedActions ?? []),
    ...(result.commandPlan?.safety.blockedReasons ?? []),
  ]).slice(0, 16);
}
