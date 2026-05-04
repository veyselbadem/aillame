import type { FeedbackRecord } from './types';

const MASK = '[REDACTED]';

const SANITIZE_PATTERNS: RegExp[] = [
  /\bail_[A-Za-z0-9_-]+\b/g,
  /\bBearer\s+[A-Za-z0-9._-]+\b/gi,
  /\b(?:GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|API_KEY)\s*[:=]\s*[^\s]+/gi,
  /\b(?:password|token|secret)\s*[:=]\s*[^\s]+/gi,
];

export function sanitizeFeedbackText(value?: string): string | undefined {
  if (!value) return value;

  return SANITIZE_PATTERNS.reduce((result, pattern) => result.replace(pattern, MASK), value);
}

export function sanitizeFeedbackRecord(record: FeedbackRecord): FeedbackRecord {
  return {
    ...record,
    optionalComment: sanitizeFeedbackText(record.optionalComment),
    feedbackText: sanitizeFeedbackText(record.feedbackText),
    promptSnapshot: sanitizeFeedbackText(record.promptSnapshot),
    answerSnapshot: sanitizeFeedbackText(record.answerSnapshot),
    correctedAnswer: sanitizeFeedbackText(record.correctedAnswer),
  };
}
