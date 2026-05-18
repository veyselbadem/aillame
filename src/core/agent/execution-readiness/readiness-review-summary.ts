import { WorkspaceAgentExecutionReadinessResult } from "./readiness-types";
import { WorkspaceAgentReadinessReviewState } from "./readiness-review-types";
import { WorkspaceAgentReadinessReviewSummary, WorkspaceAgentReadinessReviewSummaryStats } from "./readiness-review-summary-types";
import { sanitizeReadinessReviewNote } from "./readiness-review-state";

/**
 * Creates a safe, non-persistent readiness review summary.
 */
export function createReadinessReviewSummary(
  result: WorkspaceAgentExecutionReadinessResult,
  reviewState: WorkspaceAgentReadinessReviewState
): WorkspaceAgentReadinessReviewSummary {
  const stats: WorkspaceAgentReadinessReviewSummaryStats = {
    totalPermissions: result.permissions.length,
    reviewedPermissions: reviewState.reviewedPermissionCount,
    acknowledgedPermissions: reviewState.permissionReviews.filter(p => p.reviewStatus === "acknowledged_for_future").length,
    needsChangesPermissions: reviewState.permissionReviews.filter(p => p.reviewStatus === "needs_changes").length,
    rejectedPermissions: reviewState.permissionReviews.filter(p => p.reviewStatus === "rejected").length,
    pendingPermissions: reviewState.permissionReviews.filter(p => p.reviewStatus === "pending").length,
    totalPreflights: result.preflightChecks.length,
    reviewedPreflights: reviewState.reviewedPreflightCount,
    warningCount: result.warnings.length,
    activeGrantCount: 0 // Strictly zero
  };

  const permissionItems = reviewState.permissionReviews.map(pr => {
    const original = result.permissions.find(p => p.requirementId === pr.requirementId);
    return {
      id: pr.requirementId,
      type: original?.type || "unknown",
      status: pr.reviewStatus,
      note: pr.note
    };
  });

  const preflightItems = reviewState.preflightReviews.map(cr => {
    const original = result.preflightChecks.find(c => c.checkId === cr.checkId);
    return {
      id: cr.checkId,
      type: original?.type || "unknown",
      status: cr.reviewStatus,
      note: cr.note
    };
  });

  const summary: WorkspaceAgentReadinessReviewSummary = {
    planId: result.planId,
    generatedAt: new Date().toISOString(),
    status: reviewState.status,
    stats,
    permissionItems,
    preflightItems,
    warnings: result.warnings,
    safeTextPreview: "" // Will be populated next
  };

  summary.safeTextPreview = createReadinessReviewSummaryText(summary);

  return summary;
}

/**
 * Generates a safe text version of the readiness review summary.
 */
export function createReadinessReviewSummaryText(summary: WorkspaceAgentReadinessReviewSummary): string {
  let text = `WORKSPACE AGENT EXECUTION READINESS REVIEW SUMMARY\n`;
  text += `Plan ID: ${summary.planId}\n`;
  text += `Generated At: ${summary.generatedAt}\n`;
  text += `Review Status: ${summary.status.toUpperCase()}\n\n`;

  text += `--- STATS ---\n`;
  text += `Permissions: ${summary.stats.reviewedPermissions}/${summary.stats.totalPermissions} reviewed\n`;
  text += ` - Acknowledged (Future): ${summary.stats.acknowledgedPermissions}\n`;
  text += ` - Rejected/Needs Changes: ${summary.stats.rejectedPermissions + summary.stats.needsChangesPermissions}\n`;
  text += `Preflights: ${summary.stats.reviewedPreflights}/${summary.stats.totalPreflights} reviewed\n`;
  text += `Warnings: ${summary.stats.warningCount}\n`;
  text += `Active Grants: 0 (BU ÖZET İZİN VERMEZ)\n\n`;

  text += `--- PERMISSION REVIEWS ---\n`;
  summary.permissionItems.forEach(item => {
    text += `- [${item.status.toUpperCase()}] ${item.type}\n`;
    if (item.note) text += `  Note: ${item.note}\n`;
    if (item.status === 'acknowledged_for_future') {
      text += `  (Gelecekte incelenmiş olarak işaretlendi; gerçek bir yetki veya izin değildir.)\n`;
    }
  });

  text += `\n--- PREFLIGHT REVIEWS ---\n`;
  summary.preflightItems.forEach(item => {
    text += `- [${item.status.toUpperCase()}] ${item.type}\n`;
    if (item.note) text += `  Note: ${item.note}\n`;
  });

  text += `\n--- SECURITY NOTICE ---\n`;
  text += `BU ÖZET YALNIZCA HAZIR BULUNUŞLUK İNCELEMESİDİR.\n`;
  text += `HİÇBİR DOSYA DEĞİŞTİRİLMEZ VE HİÇBİR KOMUT ÇALIŞTIRILMAZ.\n`;
  text += `TÜM İZİNLER 'SATISFIED=FALSE' KALMAYA DEVAM EDER.\n`;

  return text;
}
