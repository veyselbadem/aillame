import type { FeedbackRecord } from './types';

export type DatasetEligibilityOptions = {
  includeSensitive?: boolean;
};

export function isFeedbackEligibleForDataset(
  record: FeedbackRecord,
  options: DatasetEligibilityOptions = {}
): boolean {
  const includeSensitive = options.includeSensitive === true;

  if (!record.datasetEligible) return false;
  if (!includeSensitive && record.sensitive) return false;

  if (record.rating === 'positive') {
    return typeof record.answerSnapshot === 'string' && record.answerSnapshot.trim().length > 0;
  }

  if (record.rating === 'negative') {
    return typeof record.correctedAnswer === 'string' && record.correctedAnswer.trim().length > 0;
  }

  return false;
}
