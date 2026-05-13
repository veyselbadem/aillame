export interface WorkspaceAgentReviewSummaryStats {
  totalSteps: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  warningCount: number;
}

export interface WorkspaceAgentReviewSummaryItem {
  stepId: string;
  title: string;
  reviewStatus: "pending" | "approved_for_future" | "rejected";
  note?: string;
}

export interface WorkspaceAgentReviewSummaryWarning {
  code: string;
  message: string;
}

export interface WorkspaceAgentReviewSummary {
  planId: string;
  generatedAt: string;
  status: "not_started" | "in_review" | "reviewed";
  stats: WorkspaceAgentReviewSummaryStats;
  items: WorkspaceAgentReviewSummaryItem[];
  warnings: WorkspaceAgentReviewSummaryWarning[];
  safeTextPreview: string;
}
