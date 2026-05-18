import { WorkspaceAgentPlan } from "./planning-types";
import { WorkspaceAgentPlanReviewState } from "./plan-review-types";
import {
  WorkspaceAgentReviewSummary,
  WorkspaceAgentReviewSummaryItem,
  WorkspaceAgentReviewSummaryWarning,
} from "./plan-review-summary-types";
import { sanitizePlanReviewNote } from "./plan-review-state";

/**
 * Sanitizes and masks sensitive patterns in summary text.
 */
export function sanitizeReviewSummaryText(text: string): string {
  // Reuse the robust sanitizer logic from plan-review-state
  return sanitizePlanReviewNote(text);
}

/**
 * Creates a structured review summary from a plan and its review state.
 */
export function createPlanReviewSummary(
  plan: WorkspaceAgentPlan,
  reviewState: WorkspaceAgentPlanReviewState
): WorkspaceAgentReviewSummary {
  const items: WorkspaceAgentReviewSummaryItem[] = plan.steps.map((step) => {
    const review = reviewState.stepReviews.find((sr) => sr.stepId === step.stepId);
    return {
      stepId: step.stepId,
      title: step.title,
      reviewStatus: review?.reviewStatus || "pending",
      note: review?.note,
    };
  });

  const warnings: WorkspaceAgentReviewSummaryWarning[] = (plan.warnings || []).map((w) => ({
    code: w.code,
    message: w.message,
  }));

  const stats = {
    totalSteps: items.length,
    approvedCount: reviewState.approvedStepCount,
    rejectedCount: reviewState.rejectedStepCount,
    pendingCount: items.length - reviewState.approvedStepCount - reviewState.rejectedStepCount,
    warningCount: warnings.length,
  };

  const summary: WorkspaceAgentReviewSummary = {
    planId: reviewState.planId,
    generatedAt: new Date().toISOString(),
    status: reviewState.status,
    stats,
    items,
    warnings,
    safeTextPreview: "", // Will be filled below
  };

  summary.safeTextPreview = createPlanReviewSummaryText(summary);

  return summary;
}

/**
 * Generates a human-readable text preview of the review summary.
 */
export function createPlanReviewSummaryText(summary: WorkspaceAgentReviewSummary): string {
  const lines: string[] = [
    `--- WORKSPACE AGENT PLAN REVIEW SUMMARY ---`,
    `Plan ID: ${summary.planId}`,
    `Generated At: ${summary.generatedAt}`,
    `Status: ${summary.status.toUpperCase()}`,
    ``,
    `STATS:`,
    `- Total Steps: ${summary.stats.totalSteps}`,
    `- Approved (for future): ${summary.stats.approvedCount}`,
    `- Rejected: ${summary.stats.rejectedCount}`,
    `- Pending: ${summary.stats.pendingCount}`,
    `- Warnings: ${summary.stats.warningCount}`,
    ``,
    `IMPORTANT SECURITY NOTICE:`,
    `This summary represents a non-executable review state. All steps maintain executable=false status. No file writes or shell commands were executed or recorded in this summary. Approved steps are only marked for potential consideration in future authorized phases.`,
    ``,
    `STEP DETAILS:`,
  ];

  summary.items.forEach((item) => {
    let statusText = "PENDING";
    if (item.reviewStatus === "approved_for_future") {
      statusText = "APPROVED (gelecekte izinli fazda değerlendirilebilir)";
    } else if (item.reviewStatus === "rejected") {
      statusText = "REJECTED (reddedildi)";
    } else {
      statusText = "PENDING (beklemede)";
    }

    lines.push(`[${item.stepId}] ${item.title}`);
    lines.push(`- Status: ${statusText}`);
    if (item.note) {
      lines.push(`- Note: ${sanitizeReviewSummaryText(item.note)}`);
    }
  });

  if (summary.warnings.length > 0) {
    lines.push(``);
    lines.push(`WARNINGS:`);
    summary.warnings.forEach((w) => {
      lines.push(`- [${w.code}] ${sanitizeReviewSummaryText(w.message)}`);
    });
  }

  lines.push(``);
  lines.push(`--- END OF SUMMARY ---`);

  return lines.join("\n");
}
