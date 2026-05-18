import { WorkspaceAgentExecutionGateResult } from "./gate-types";
import { WorkspaceAgentExecutionGateReviewState } from "./gate-review-types";
import { WorkspaceAgentGateReviewSummary, WorkspaceAgentGateReviewSummaryItem } from "./gate-review-summary-types";
import { sanitizeGateReviewNote } from "./gate-review-state";

/**
 * Builds a secure, non-persistent summary of the gate review.
 */
export function createGateReviewSummary(
  result: WorkspaceAgentExecutionGateResult,
  reviewState: WorkspaceAgentExecutionGateReviewState
): WorkspaceAgentGateReviewSummary {
  const generatedAt = new Date().toISOString();
  
  const allReviewStatuses = [
    reviewState.decisionReview.reviewStatus,
    ...reviewState.checkReviews.map(r => r.reviewStatus),
    ...reviewState.riskReviews.map(r => r.reviewStatus)
  ];

  const stats = {
    totalChecks: result.checks.length,
    reviewedChecks: reviewState.reviewedCheckCount,
    totalRisks: result.risks.length,
    reviewedRisks: reviewState.reviewedRiskCount,
    acknowledgedCount: allReviewStatuses.filter(s => s === "acknowledged").length,
    needsChangesCount: allReviewStatuses.filter(s => s === "needs_changes").length,
    rejectedCount: allReviewStatuses.filter(s => s === "rejected").length,
    pendingCount: allReviewStatuses.filter(s => s === "pending").length,
    activeCapabilityCount: 0 as const
  };

  const decisionItem: WorkspaceAgentGateReviewSummaryItem = {
    id: "decision",
    label: "Karar Değerlendirmesi",
    status: result.decision,
    reviewStatus: reviewState.decisionReview.reviewStatus,
    note: reviewState.decisionReview.note
  };

  const checkItems: WorkspaceAgentGateReviewSummaryItem[] = result.checks.map(c => {
    const review = reviewState.checkReviews.find(r => r.checkId === c.checkId);
    return {
      id: c.checkId,
      label: c.type,
      status: c.status,
      reviewStatus: review?.reviewStatus || "pending",
      note: review?.note
    };
  });

  const riskItems: WorkspaceAgentGateReviewSummaryItem[] = result.risks.map(r => {
    const review = reviewState.riskReviews.find(rev => rev.riskId === r.code);
    return {
      id: r.code,
      label: r.message,
      status: r.level,
      reviewStatus: review?.reviewStatus || "pending",
      note: review?.note
    };
  });

  const summary: WorkspaceAgentGateReviewSummary = {
    requestId: result.requestId,
    planId: result.planId,
    generatedAt,
    status: reviewState.status,
    stats,
    decisionItem,
    checkItems,
    riskItems,
    warnings: result.warnings.map(w => w.message),
    safeTextPreview: "" // Will be generated below
  };

  summary.safeTextPreview = createGateReviewSummaryText(summary);

  return summary;
}

/**
 * Generates a human-readable text summary of the gate review.
 */
export function createGateReviewSummaryText(summary: WorkspaceAgentGateReviewSummary): string {
  const lines: string[] = [];
  lines.push(`WORKSPACE AGENT EXECUTION GATE REVIEW SUMMARY`);
  lines.push(`Generated At: ${summary.generatedAt}`);
  lines.push(`Request ID: ${summary.requestId}`);
  lines.push(`----------------------------------------------`);
  lines.push(`DECISION: ${summary.decisionItem.status} (Review: ${summary.decisionItem.reviewStatus})`);
  if (summary.decisionItem.note) lines.push(`Note: ${summary.decisionItem.note}`);
  lines.push(``);
  
  lines.push(`STATS:`);
  lines.push(`- Reviewed Checks: ${summary.stats.reviewedChecks}/${summary.stats.totalChecks}`);
  lines.push(`- Reviewed Risks: ${summary.stats.reviewedRisks}/${summary.stats.totalRisks}`);
  lines.push(`- Acknowledged: ${summary.stats.acknowledgedCount}`);
  lines.push(`- Needs Changes: ${summary.stats.needsChangesCount}`);
  lines.push(`- Rejected: ${summary.stats.rejectedCount}`);
  lines.push(``);

  lines.push(`SECURITY BOUNDARY:`);
  lines.push(`- canExecute: FALSE`);
  lines.push(`- canWrite: FALSE`);
  lines.push(`- canRunShell: FALSE`);
  lines.push(`- issuedCapability: NULL`);
  lines.push(`- activeCapabilityCount: 0`);
  lines.push(``);

  lines.push(`NOTICE: This summary does not grant any permissions and cannot be executed.`);
  lines.push(`'Acknowledged' status means human review only; it does NOT produce a capability token.`);
  lines.push(`----------------------------------------------`);

  return lines.join("\n");
}
