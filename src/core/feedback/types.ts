import type { ModelAdapterId } from '@core/model-adapters/base';
import type { AillameIntent, AillameSafetyFlags, AillameMode } from '@core/aillame-router/types';

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
};

export type FeedbackRecord = FeedbackPayload & {
  createdAt: number;
};

export interface FeedbackStore {
  saveFeedback(feedback: FeedbackPayload): Promise<FeedbackRecord>;
  listFeedback(): Promise<FeedbackRecord[]>;
}
