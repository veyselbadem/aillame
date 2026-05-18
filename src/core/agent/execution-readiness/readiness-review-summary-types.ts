import { WorkspaceAgentPermissionReviewStatus, WorkspaceAgentPreflightReviewStatus } from "./readiness-review-types";

export interface WorkspaceAgentReadinessReviewSummaryStats {
  totalPermissions: number;
  reviewedPermissions: number;
  acknowledgedPermissions: number;
  needsChangesPermissions: number;
  rejectedPermissions: number;
  pendingPermissions: number;
  totalPreflights: number;
  reviewedPreflights: number;
  warningCount: number;
  activeGrantCount: number;
}

export interface WorkspaceAgentReadinessReviewSummaryItem {
  id: string;
  type: string;
  status: WorkspaceAgentPermissionReviewStatus | WorkspaceAgentPreflightReviewStatus;
  note?: string;
}

export interface WorkspaceAgentReadinessReviewSummary {
  planId: string;
  generatedAt: string;
  status: string;
  stats: WorkspaceAgentReadinessReviewSummaryStats;
  permissionItems: WorkspaceAgentReadinessReviewSummaryItem[];
  preflightItems: WorkspaceAgentReadinessReviewSummaryItem[];
  warnings: Array<{ code: string; message: string }>;
  safeTextPreview: string;
}
