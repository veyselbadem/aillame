import type { AillamePatchPlanInput, AillamePatchPlanResult, AillamePatchRiskLevel } from "./patch-plan-types";

const RISK_SCORE: Record<AillamePatchRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  blocked: 4,
};

export function highestRisk(risks: readonly AillamePatchRiskLevel[]): AillamePatchRiskLevel {
  return [...risks].sort((a: AillamePatchRiskLevel, b: AillamePatchRiskLevel) => RISK_SCORE[b] - RISK_SCORE[a])[0] ?? "low";
}

export function buildSafetyNotes(input: AillamePatchPlanInput): string[] {
  const notes = [
    "Plan-only mode: no files are written, deleted, or patched.",
    "No terminal commands are executed by this planner.",
    "Every target requires review before implementation.",
  ];

  if (input.constraints?.allowFileWrites) {
    notes.push("File write permission was requested but ignored in this read-only phase.");
  }

  if (input.constraints?.allowCommandRun) {
    notes.push("Command execution permission was requested but ignored in this read-only phase.");
  }

  return notes;
}

export function summarizePatchPlan(result: Pick<AillamePatchPlanResult, "targets" | "risk">, goal?: string): string {
  const goalText = goal ? ` for goal: ${goal}` : "";
  return `Plan-only patch analysis${goalText}. ${result.targets.length} target candidate(s), overall risk=${result.risk}.`;
}
