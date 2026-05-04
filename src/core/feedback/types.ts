import type { ModelAdapterId } from '@core/model-adapters/base';
import type { AillameIntent, AillameSafetyFlags, AillameMode } from '@core/aillame-router/types';
import type { FeedbackRating, FeedbackSource } from './schema-v2';

export type FeedbackType = 'like' | 'dislike';

export type FeedbackRouterMetadata = {
  primaryMode?: AillameMode;
  selectedModes?: AillameMode[];
  intent?: AillameIntent;
  requiredAdapters?: ModelAdapterId[];
  memoryScopes?: string[];
  safetyFlags?: Partial<AillameSafetyFlags>;
  sessionId?: string;
  messageId?: string;
};

export type FeedbackPayload = {
  messageId: string;
  conversationId: string;
  selectedFeedback: FeedbackType;
  optionalComment?: string;
  taskId?: string;
  metadata?: FeedbackRouterMetadata;
  projectId?: string;
  mode?: string;
  task?: string;
  responseId?: string;
  modelId?: string;
  runtime?: string;
  rating?: FeedbackRating;
  feedbackText?: string;
  promptSnapshot?: string;
  answerSnapshot?: string;
  correctedAnswer?: string;
  tags?: string[];
  datasetEligible?: boolean;
  sensitive?: boolean;
  source?: FeedbackSource;
};

export type FeedbackRecord = FeedbackPayload & {
  id: string;
  createdAt: number;
  projectId: string;
  mode: string;
  task: string;
  responseId: string;
  rating: FeedbackRating;
  tags: string[];
  datasetEligible: boolean;
  sensitive: boolean;
  source: FeedbackSource;
};

export type FeedbackListOptions = {
  projectId?: string;
};

export interface FeedbackStore {
  saveFeedback(feedback: FeedbackPayload | FeedbackRecord): Promise<FeedbackRecord>;
  listFeedback(options?: FeedbackListOptions): Promise<FeedbackRecord[]>;
}
