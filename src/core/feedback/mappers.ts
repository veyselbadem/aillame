import type { FeedbackPayload, FeedbackRecord, FeedbackType } from './types';
import type { FeedbackRating, FeedbackSource } from './schema-v2';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomSuffix()}`;
}

export function mapSelectedFeedbackToRating(value?: string): FeedbackRating | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();

  if (['positive', 'like', 'thumbs_up'].includes(normalized)) {
    return 'positive';
  }

  if (['negative', 'dislike', 'thumbs_down'].includes(normalized)) {
    return 'negative';
  }

  return undefined;
}

export function mapRatingToSelectedFeedback(rating?: FeedbackRating): FeedbackType | undefined {
  if (rating === 'positive') return 'like';
  if (rating === 'negative') return 'dislike';
  return undefined;
}

export function normalizeFeedbackPayload(
  payload: unknown,
  source: FeedbackSource = 'unknown'
): FeedbackRecord {
  const data = isRecord(payload) ? payload : {};

  const ratingFromSelected = mapSelectedFeedbackToRating(toStringOrUndefined(data.selectedFeedback));
  const ratingFromRating = mapSelectedFeedbackToRating(toStringOrUndefined(data.rating));
  const rating: FeedbackRating = ratingFromRating ?? ratingFromSelected ?? 'positive';

  const responseId =
    toStringOrUndefined(data.responseId) ??
    toStringOrUndefined(data.messageId) ??
    createId('res');

  const conversationId = toStringOrUndefined(data.conversationId) ?? createId('conv');
  const messageId = toStringOrUndefined(data.messageId) ?? responseId;

  const selectedFeedback =
    (toStringOrUndefined(data.selectedFeedback) as FeedbackType | undefined) ??
    mapRatingToSelectedFeedback(rating) ??
    'like';

  const feedbackText =
    toStringOrUndefined(data.feedbackText) ??
    toStringOrUndefined(data.optionalComment);

  const task = toStringOrUndefined(data.task) ?? toStringOrUndefined(data.taskId) ?? 'feedback';

  return {
    id: toStringOrUndefined(data.id) ?? createId('fb'),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    messageId,
    conversationId,
    selectedFeedback,
    optionalComment: toStringOrUndefined(data.optionalComment) ?? feedbackText,
    taskId: toStringOrUndefined(data.taskId) ?? task,
    metadata: isRecord(data.metadata) ? (data.metadata as FeedbackPayload['metadata']) : undefined,
    projectId: toStringOrUndefined(data.projectId) ?? 'aillame-local',
    mode: toStringOrUndefined(data.mode) ?? 'general',
    task,
    responseId,
    modelId: toStringOrUndefined(data.modelId),
    runtime: toStringOrUndefined(data.runtime),
    rating,
    feedbackText,
    promptSnapshot: toStringOrUndefined(data.promptSnapshot),
    answerSnapshot: toStringOrUndefined(data.answerSnapshot),
    correctedAnswer: toStringOrUndefined(data.correctedAnswer),
    tags: toStringArray(data.tags),
    datasetEligible: toBoolean(data.datasetEligible, true),
    sensitive: toBoolean(data.sensitive, false),
    source: toStringOrUndefined(data.source) as FeedbackSource | undefined ?? source,
  };
}
