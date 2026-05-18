import { NanoFeedbackRecord, NanoTrainingCandidate } from './nano-feedback.types';

/**
 * Nano Training Candidate Builder - Phase H
 * 
 * Helper to transform feedback records into potential training candidates for admin review.
 */
export class NanoTrainingCandidateBuilder {
  /**
   * Creates a training candidate from a feedback record.
   * Default state is safeForTraining: false, requiresReview: true.
   */
  static buildCandidate(record: NanoFeedbackRecord): NanoTrainingCandidate {
    return {
      candidateId: `candidate_${record.feedbackId}`,
      sourceFeedbackId: record.feedbackId,
      input: record.userMessageSummary,
      expectedDecision: {
        intent: record.intent,
        requiredCapabilities: record.requiredCapabilities
      },
      expectedPlan: {
        steps: record.executionSummary.stepsTotal
      },
      preferredOutput: record.userFeedback?.accepted ? record.userMessageSummary : undefined,
      tags: [...record.qualitySignals, ...record.safetyFlags, record.intent],
      language: record.language,
      safeForTraining: false, // Mandatory: never auto-approve
      schemaVersion: '1.0.0'
    };
  }
}
