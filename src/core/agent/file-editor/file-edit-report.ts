import type { AillameFileDiffPlan } from "./file-edit-types";

export function summarizeFileEditPlan(plan: AillameFileDiffPlan): string {
  return `Dry-run file edit plan for ${plan.relativePath}: operation=${plan.operation}, risk=${plan.risk}, allowed=${plan.policy.allowed}.`;
}

export function getFileEditReviewChecklist(plan: AillameFileDiffPlan): string[] {
  return [
    "Confirm the target path is inside the workspace root.",
    "Review diff preview before approving any future write.",
    "Confirm backup strategy before write mode is enabled.",
    "Confirm rollback path before write mode is enabled.",
    ...plan.policy.warnings,
  ];
}
