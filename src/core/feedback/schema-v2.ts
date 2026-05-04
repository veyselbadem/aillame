export const FEEDBACK_RATINGS = ['positive', 'negative'] as const;

export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const FEEDBACK_SOURCES = [
  'feedback_ui',
  'legacy_feedback_api',
  'aillame_feedback_api',
  'unknown',
] as const;

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

export type FeedbackV2Metadata = Record<string, unknown>;

export type FeedbackV2Fields = {
  id: string;
  createdAt: string;
  projectId: string;
  mode: string;
  task: string;
  conversationId: string;
  responseId: string;
  modelId?: string;
  runtime?: string;
  rating: FeedbackRating;
  feedbackText?: string;
  promptSnapshot?: string;
  answerSnapshot?: string;
  correctedAnswer?: string;
  tags: string[];
  datasetEligible: boolean;
  sensitive: boolean;
  source: FeedbackSource;
  metadata?: FeedbackV2Metadata;
};
