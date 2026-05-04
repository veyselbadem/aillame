import { jsonLearningCandidateStore } from './store-json';
import type { CreateLearningCandidateInput, LearningCandidate, LearningCandidateStatus } from './types';
import type { FeedbackPayload, FeedbackRecord } from '@core/feedback/types';
import { getFeedbackLearningCandidateEligibility } from '@core/feedback/bridge-rules';

function toSelectedFeedback(rating: FeedbackRecord['rating']): FeedbackPayload['selectedFeedback'] {
  return rating === 'negative' ? 'dislike' : 'like';
}

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

export async function findLearningCandidateBySourceFeedbackId(sourceFeedbackId: string): Promise<LearningCandidate | undefined> {
  const candidates = await listLearningCandidates();
  return candidates.find((candidate) => candidate.sourceFeedbackId === sourceFeedbackId);
}

export async function createLearningCandidateFromFeedbackBridge(
  feedback: FeedbackRecord,
  options: { includeSensitive?: boolean; reason?: string } = {}
): Promise<LearningCandidate> {
  const eligibility = getFeedbackLearningCandidateEligibility(feedback, {
    includeSensitive: options.includeSensitive,
  });

  if (!eligibility.eligible || !eligibility.type || !eligibility.expectedOutput) {
    throw new Error('Feedback kaydı learning candidate için uygun değil.');
  }

  return createLearningCandidate({
    source: 'feedback',
    sourceFeedbackId: feedback.id,
    projectId: feedback.projectId,
    mode: feedback.mode,
    task: feedback.task,
    responseId: feedback.responseId,
    modelId: feedback.modelId,
    rating: feedback.rating,
    instruction: eligibility.instruction,
    input: eligibility.input,
    expectedOutput: eligibility.expectedOutput,
    tags: feedback.tags,
    messageId: feedback.messageId,
    conversationId: feedback.conversationId,
    type: eligibility.type,
    selectedFeedback: toSelectedFeedback(feedback.rating),
    optionalComment: feedback.feedbackText ?? feedback.optionalComment,
    taskId: feedback.task,
    metadata: {
      primaryMode: feedback.mode as any,
      intent: feedback.task as any,
      messageId: feedback.messageId,
    },
    reason:
      options.reason ||
      (feedback.rating === 'negative'
        ? 'Negative feedback with corrected answer selected by admin bridge.'
        : 'Positive feedback snapshot selected by admin bridge.'),
  });
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
