import { LabMessage } from './types';
import { validateNanoTrainingRecord } from '../nano-training/validator';
import { createLearningCandidate } from '../learning-candidates/service';

import { NanoLearningSuggestion } from '../nano-cognitive/types';

/**
 * AI Lab mesajından bir eğitim adayı (training candidate) oluşturur.
 * Doğrudan eğitime girmez, önce validator'dan geçer ve admin onayı bekler.
 */
export async function createTrainingCandidateFromAiLabMessage(message: LabMessage, topic: string, suggestion?: NanoLearningSuggestion) {
  // 1. Validator kontrolü
  const validation = validateNanoTrainingRecord({
    id: `lab_${message.id}`,
    instruction: suggestion?.instruction || `Explain ${topic}`,
    input: suggestion?.input || '',
    output: suggestion?.output || message.content,
    source: 'ai_lab',
    sourceId: message.id,
    riskLevel: suggestion?.riskLevel || 'low',
    approved: false,
    createdAt: Date.now()
  }, { isCandidate: true });

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
    source: 'ai_lab',
    selectedFeedback: 'like',
    reason: `AI Lab learning candidate: ${suggestion?.instruction || topic}`,
    optionalComment: `instruction: ${suggestion?.instruction || `Explain ${topic}`}\noutput: ${suggestion?.output || message.content}\nsource: ${suggestion?.source || 'ai_lab'}\nriskLevel: ${suggestion?.riskLevel || 'low'}`,
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
