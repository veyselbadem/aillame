import type { FeedbackRecord } from './types';
import { isFeedbackEligibleForDataset } from './eligibility';
import { sanitizeFeedbackRecord, sanitizeFeedbackText } from './sanitize';

export type FeedbackDatasetRow = {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    projectId: string;
    mode: string;
    task: string;
    modelId?: string;
    source: 'feedback';
    feedbackId: string;
    responseId: string;
    sensitive: boolean;
  };
};

export type FeedbackExportOptions = {
  includeSensitive?: boolean;
  projectId?: string;
};

function buildInstruction(record: FeedbackRecord): string {
  if (record.feedbackText) {
    return sanitizeFeedbackText(record.feedbackText) ?? 'Feedback-based instruction';
  }

  return record.rating === 'negative'
    ? 'Kullanici geri bildirimine gore yaniti duzelt.'
    : 'Kullanici ihtiyacina uygun kaliteli yanit uret.';
}

function buildInput(record: FeedbackRecord): string {
  const prompt = sanitizeFeedbackText(record.promptSnapshot);
  if (prompt) return prompt;

  const comment = sanitizeFeedbackText(record.feedbackText);
  return comment ?? '';
}

function buildOutput(record: FeedbackRecord): string | undefined {
  if (record.rating === 'negative') {
    return sanitizeFeedbackText(record.correctedAnswer);
  }

  return sanitizeFeedbackText(record.answerSnapshot);
}

export function feedbackToDatasetRow(record: FeedbackRecord): FeedbackDatasetRow | null {
  const output = buildOutput(record);
  if (!output || output.trim().length === 0) {
    return null;
  }

  return {
    instruction: buildInstruction(record),
    input: buildInput(record),
    output,
    metadata: {
      projectId: record.projectId ?? 'aillame-local',
      mode: record.mode ?? 'general',
      task: record.task ?? 'feedback',
      modelId: record.modelId,
      source: 'feedback',
      feedbackId: record.id,
      responseId: record.responseId ?? record.messageId,
      sensitive: record.sensitive ?? false,
    },
  };
}

export function exportFeedbackJsonl(records: FeedbackRecord[], options: FeedbackExportOptions = {}): string {
  const lines = records
    .filter((record) => !options.projectId || record.projectId === options.projectId)
    .filter((record) => isFeedbackEligibleForDataset(record, { includeSensitive: options.includeSensitive }))
    .map((record) => sanitizeFeedbackRecord(record))
    .map((record) => feedbackToDatasetRow(record))
    .filter((row): row is FeedbackDatasetRow => row !== null)
    .map((row) => JSON.stringify(row));

  return lines.join('\n');
}
