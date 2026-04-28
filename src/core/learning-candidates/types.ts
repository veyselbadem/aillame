import type { FeedbackType, FeedbackRouterMetadata } from '@core/feedback/types';

export type LearningCandidateType = 'positive_learning_candidate' | 'improvement_candidate';
export type LearningCandidateStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type LearningCandidateSource = 'feedback' | 'ai_lab';

export type LearningCandidate = {
  id: string;
  type: LearningCandidateType;
  status: LearningCandidateStatus;
  source: LearningCandidateSource;
  sourceFeedbackId: string;
  messageId: string;
  conversationId: string;
  selectedFeedback: FeedbackType;
  optionalComment?: string;
  taskId?: string;
  primaryMode?: string;
  selectedModes?: string[];
  intent?: string;
  requiredAdapters?: string[];
  memoryScopes?: string[];
  safetyFlags?: FeedbackRouterMetadata['safetyFlags'];
  reason: string;
  createdAt: number;
  updatedAt: number;
};

export type CreateLearningCandidateInput = {
  sourceFeedbackId: string;
  messageId: string;
  conversationId: string;
  type: LearningCandidateType;
  selectedFeedback: FeedbackType;
  optionalComment?: string;
  taskId?: string;
  metadata?: FeedbackRouterMetadata;
  source?: LearningCandidateSource;
  reason: string;
};
