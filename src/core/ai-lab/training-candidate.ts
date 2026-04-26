import { LabMessage } from './types';
import { validateNanoTrainingRecord } from '../nano-training/validator';
import { createLearningCandidate } from '../learning-candidates/service';

/**
 * AI Lab mesajından bir eğitim adayı (training candidate) oluşturur.
 * Doğrudan eğitime girmez, önce validator'dan geçer ve admin onayı bekler.
 */
export async function createTrainingCandidateFromAiLabMessage(message: LabMessage, topic: string) {
  // 1. Validator kontrolü
  const validation = validateNanoTrainingRecord({
    id: `lab_${message.id}`,
    instruction: `Explain ${topic}`,
    input: '',
    output: message.content,
    source: 'ai_lab',
    sourceId: message.id,
    riskLevel: 'low',
    approved: false,
    createdAt: Date.now()
  });

  if (!validation.valid) {
    return {
      success: false,
      validation,
      acceptedForReview: false
    };
  }

  // 2. Learning Candidate oluştur
  const candidate = await createLearningCandidate({
    sourceFeedbackId: message.id,
    messageId: message.id,
    conversationId: message.sessionId,
    type: 'positive_learning_candidate',
    selectedFeedback: 'like',
    reason: `AI Lab discussion on topic: ${topic}`,
    metadata: {
      sessionId: message.sessionId,
      messageId: message.id
    }
  });

  return {
    success: true,
    candidate,
    validation,
    acceptedForReview: true
  };
}
