import { jsonLearningCandidateStore } from './store-json';
import type { CreateLearningCandidateInput, LearningCandidate, LearningCandidateStatus } from './types';
import type { FeedbackPayload } from '@core/feedback/types';

export async function createOrUpdateCandidateFromFeedback(feedback: FeedbackPayload): Promise<LearningCandidate> {
  const sourceFeedbackId = `${feedback.conversationId}:${feedback.messageId}`;
  const type = feedback.selectedFeedback === 'like'
    ? 'positive_learning_candidate'
    : 'improvement_candidate';

  const payload: CreateLearningCandidateInput = {
    sourceFeedbackId,
    messageId: feedback.messageId,
    conversationId: feedback.conversationId,
    type,
    selectedFeedback: feedback.selectedFeedback,
    optionalComment: feedback.optionalComment,
    taskId: feedback.taskId,
    metadata: feedback.metadata,
    reason: feedback.selectedFeedback === 'like'
      ? 'Like feedback suggests a positive learning candidate.'
      : 'Dislike feedback suggests an improvement candidate.',
  };

  return jsonLearningCandidateStore.upsertCandidate(payload);
}

export async function createLearningCandidate(input: CreateLearningCandidateInput): Promise<LearningCandidate> {
  return jsonLearningCandidateStore.upsertCandidate(input);
}

export async function listLearningCandidates(): Promise<LearningCandidate[]> {
  return jsonLearningCandidateStore.listCandidates();
}

export async function getLearningCandidateById(id: string): Promise<LearningCandidate | undefined> {
  return jsonLearningCandidateStore.getCandidateById(id);
}

export async function updateLearningCandidateStatus(id: string, status: LearningCandidateStatus): Promise<LearningCandidate | undefined> {
  return jsonLearningCandidateStore.updateCandidateStatus(id, status);
}
