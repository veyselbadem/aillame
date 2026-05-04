import type { FeedbackRecord } from './types';

export type FeedbackLearningCandidateType = 'positive_learning_candidate' | 'improvement_candidate';

export type FeedbackLearningCandidateEligibility = {
  eligible: boolean;
  type?: FeedbackLearningCandidateType;
  instruction?: string;
  input?: string;
  expectedOutput?: string;
  reason?: string;
};

export type FeedbackLearningCandidateRuleOptions = {
  includeSensitive?: boolean;
};

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getFeedbackLearningCandidateEligibility(
  feedback: FeedbackRecord,
  options: FeedbackLearningCandidateRuleOptions = {}
): FeedbackLearningCandidateEligibility {
  const includeSensitive = options.includeSensitive === true;

  if (feedback.sensitive && !includeSensitive) {
    return {
      eligible: false,
      reason: 'Sensitive kayıtlar includeSensitive=true olmadan dönüştürülemez.',
    };
  }

  if (!feedback.datasetEligible) {
    return {
      eligible: false,
      reason: 'Feedback kaydı datasetEligible=true değil.',
    };
  }

  if (feedback.rating === 'negative') {
    if (!hasText(feedback.correctedAnswer)) {
      return {
        eligible: false,
        reason: 'Negative feedback için correctedAnswer gerekli.',
      };
    }

    const instruction =
      feedback.promptSnapshot ||
      feedback.feedbackText ||
      'Improve the assistant response based on feedback.';
    const input = feedback.feedbackText || feedback.promptSnapshot || '';

    return {
      eligible: true,
      type: 'improvement_candidate',
      instruction,
      input,
      expectedOutput: feedback.correctedAnswer,
    };
  }

  if (feedback.rating === 'positive') {
    if (!hasText(feedback.promptSnapshot) || !hasText(feedback.answerSnapshot)) {
      return {
        eligible: false,
        reason: 'Positive feedback için promptSnapshot ve answerSnapshot gerekli.',
      };
    }

    return {
      eligible: true,
      type: 'positive_learning_candidate',
      instruction: feedback.promptSnapshot,
      input: feedback.feedbackText || '',
      expectedOutput: feedback.answerSnapshot,
    };
  }

  return {
    eligible: false,
    reason: 'Feedback kaydı learning candidate için uygun değil.',
  };
}
