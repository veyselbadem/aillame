import { WorkspaceAgentExecutionGateDecision } from "./gate-types";

export type WorkspaceAgentGateReviewStatus = 
  | "not_started"
  | "in_review"
  | "reviewed";

export type WorkspaceAgentGateDecisionReviewStatus = 
  | "pending"
  | "acknowledged"
  | "needs_changes"
  | "rejected";

export type WorkspaceAgentGateCheckReviewStatus = 
  | "pending"
  | "acknowledged"
  | "needs_changes";

export type WorkspaceAgentGateRiskReviewStatus = 
  | "pending"
  | "acknowledged"
  | "needs_changes"
  | "rejected";

export interface WorkspaceAgentGateDecisionReview {
  decision: WorkspaceAgentExecutionGateDecision;
  reviewStatus: WorkspaceAgentGateDecisionReviewStatus;
  note?: string;
  reviewedAt?: string;
}

export interface WorkspaceAgentGateCheckReview {
  checkId: string;
  reviewStatus: WorkspaceAgentGateCheckReviewStatus;
  note?: string;
  reviewedAt?: string;
}

export interface WorkspaceAgentGateRiskReview {
  riskId: string;
  reviewStatus: WorkspaceAgentGateRiskReviewStatus;
  note?: string;
  reviewedAt?: string;
}

export interface WorkspaceAgentExecutionGateReviewState {
  requestId: string;
  planId?: string;
  reviewedAt?: string;
  status: WorkspaceAgentGateReviewStatus;
  decisionReview: WorkspaceAgentGateDecisionReview;
  checkReviews: WorkspaceAgentGateCheckReview[];
  riskReviews: WorkspaceAgentGateRiskReview[];
  warningCount: number;
  reviewedCheckCount: number;
  reviewedRiskCount: number;
}
