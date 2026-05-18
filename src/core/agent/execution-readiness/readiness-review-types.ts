export type WorkspaceAgentReadinessReviewStatus = 
  | "not_started" 
  | "in_review" 
  | "reviewed";

export type WorkspaceAgentPermissionReviewStatus = 
  | "pending" 
  | "acknowledged_for_future" 
  | "needs_changes" 
  | "rejected";

export type WorkspaceAgentPreflightReviewStatus = 
  | "pending" 
  | "acknowledged" 
  | "needs_changes";

export interface WorkspaceAgentPermissionReview {
  requirementId: string;
  reviewStatus: WorkspaceAgentPermissionReviewStatus;
  note?: string;
  reviewedAt?: string;
}

export interface WorkspaceAgentPreflightReview {
  checkId: string;
  reviewStatus: WorkspaceAgentPreflightReviewStatus;
  note?: string;
  reviewedAt?: string;
}

export interface WorkspaceAgentReadinessReviewState {
  planId: string;
  reviewedAt?: string;
  status: WorkspaceAgentReadinessReviewStatus;
  permissionReviews: WorkspaceAgentPermissionReview[];
  preflightReviews: WorkspaceAgentPreflightReview[];
  warningCount: number;
  reviewedPermissionCount: number;
  reviewedPreflightCount: number;
}

export interface WorkspaceAgentReadinessReviewWarning {
  code: string;
  message: string;
}
