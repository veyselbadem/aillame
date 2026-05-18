export type WorkspaceAgentPlanReviewStatus = "not_started" | "in_review" | "reviewed";

export type WorkspaceAgentPlanStepReviewStatus = "pending" | "approved_for_future" | "rejected";

export interface WorkspaceAgentPlanStepReview {
  stepId: string;
  reviewStatus: WorkspaceAgentPlanStepReviewStatus;
  note?: string;
  reviewedAt?: string;
}

export interface WorkspaceAgentPlanReviewWarning {
  stepId?: string;
  code: string;
  message: string;
}

export interface WorkspaceAgentPlanReviewState {
  planId: string;
  reviewedAt?: string;
  status: WorkspaceAgentPlanReviewStatus;
  stepReviews: WorkspaceAgentPlanStepReview[];
  warningCount: number;
  approvedStepCount: number;
  rejectedStepCount: number;
}
