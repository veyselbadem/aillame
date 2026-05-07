export type FeedbackQualitySignal = "like" | "dislike" | "correction" | "unsafe" | "unknown";
export type FeedbackCandidateStatus = "pending-review" | "approved" | "rejected" | "exported" | "ignored";

export type FeedbackCorrectionPair = {
  originalOutput: string;
  correctedOutput?: string;
  reason?: string;
};

export type FeedbackLearningCandidate = {
  id: string;
  projectId: string;
  mode: string;
  signal: FeedbackQualitySignal;
  status: FeedbackCandidateStatus;
  instruction: string;
  correction?: FeedbackCorrectionPair;
  metadata: {
    source: "feedback";
    sourceApp?: string;
    createdAt: string;
    sensitiveBlocked: boolean;
  };
};

export type FeedbackDatasetExportResult = {
  success: boolean;
  exported: number;
  skipped: number;
  warnings: string[];
};
