export interface WorkspaceAgentGateReviewSummaryStats {
  totalChecks: number;
  reviewedChecks: number;
  totalRisks: number;
  reviewedRisks: number;
  acknowledgedCount: number;
  needsChangesCount: number;
  rejectedCount: number;
  pendingCount: number;
  activeCapabilityCount: 0;
}

export interface WorkspaceAgentGateReviewSummaryItem {
  id: string;
  label: string;
  status: string;
  reviewStatus: string;
  note?: string;
}

export interface WorkspaceAgentGateReviewSummary {
  requestId: string;
  planId?: string;
  generatedAt: string;
  status: string;
  stats: WorkspaceAgentGateReviewSummaryStats;
  decisionItem: WorkspaceAgentGateReviewSummaryItem;
  checkItems: WorkspaceAgentGateReviewSummaryItem[];
  riskItems: WorkspaceAgentGateReviewSummaryItem[];
  warnings: string[];
  safeTextPreview: string;
}
