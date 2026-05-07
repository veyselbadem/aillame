import { getPatchRuleForCategory, buildTargetsFromRule } from "./patch-plan-rules";
import { buildSafetyNotes, highestRisk, summarizePatchPlan } from "./patch-plan-report";
import type {
  AillamePatchPlanInput,
  AillamePatchPlanResult,
  AillamePatchPlanStep,
} from "./patch-plan-types";

function buildBlockedActions(input: AillamePatchPlanInput): string[] {
  const actions = [
    "Writing files",
    "Deleting files",
    "Applying patches",
    "Running terminal commands",
  ];

  if (input.constraints?.allowFileWrites) actions.push("Requested file writes are blocked in this phase");
  if (input.constraints?.allowCommandRun) actions.push("Requested command execution is blocked in this phase");
  return actions;
}

function buildSteps(input: AillamePatchPlanInput, targetFiles: string[]): AillamePatchPlanStep[] {
  const category = input.problemAnalysis?.category ?? "unknown";
  const rule = getPatchRuleForCategory(category);
  const blocked = category === "unknown";

  return [
    {
      id: "inspect-context",
      title: "Inspect relevant context",
      description: "Review the problem evidence and workspace report before proposing edits.",
      targetFiles,
      risk: rule.risk,
      blocked: false,
    },
    {
      id: "confirm-root-cause",
      title: "Confirm likely root cause",
      description: "Use the problem evidence to narrow the cause without changing files.",
      targetFiles,
      risk: rule.risk,
      blocked,
      blockReason: blocked ? "Problem category is unknown; more log context is required." : undefined,
    },
    {
      id: "prepare-minimal-edit-plan",
      title: "Prepare minimal edit plan",
      description: "Describe the smallest likely code/config change, but do not apply it in this phase.",
      targetFiles,
      risk: rule.risk,
      blocked: true,
      blockReason: "Implementation is outside this read-only planning phase.",
    },
  ];
}

export function planPatchReadOnly(input: AillamePatchPlanInput): AillamePatchPlanResult {
  const category = input.problemAnalysis?.category ?? "unknown";
  const rule = getPatchRuleForCategory(category);
  const importantFiles = input.workspaceReport?.importantFiles ?? [];
  const targets = buildTargetsFromRule({ category, importantFiles });
  const risks = targets.map((target) => target.risk);
  const risk = input.problemAnalysis?.severity === "critical" ? "blocked" : highestRisk(risks);
  const targetFiles = targets.map((target) => target.relativePath);
  const preChecks = [
    ...(input.problemAnalysis?.recommendedChecks ?? []),
    ...(input.workspaceReport?.recommendedNextChecks ?? []),
    ...rule.checks,
  ];
  const postChecks = [
    "After user-approved implementation, run the smallest relevant validation command.",
    "Re-run the original failing scenario after changes are approved and applied.",
    "Confirm no unrelated files were changed.",
  ];
  const partial: Pick<AillamePatchPlanResult, "targets" | "risk"> = { targets, risk };

  return {
    success: true,
    mode: "plan-only",
    summary: summarizePatchPlan(partial, input.userGoal),
    risk,
    targets,
    steps: buildSteps(input, targetFiles),
    preChecks: Array.from(new Set(preChecks)).slice(0, 12),
    postChecks,
    safetyNotes: buildSafetyNotes(input),
    blockedActions: buildBlockedActions(input),
    readOnly: true,
  };
}
