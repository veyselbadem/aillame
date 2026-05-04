import { jsonFeedbackStore } from './store-json';
import type { FeedbackListOptions, FeedbackPayload, FeedbackRecord } from './types';
import { normalizeFeedbackPayload } from './mappers';
import { exportFeedbackJsonl, type FeedbackExportOptions } from './export-jsonl';
import type { FeedbackSource } from './schema-v2';

export async function saveFeedback(payload: unknown, source: FeedbackSource = 'legacy_feedback_api'): Promise<FeedbackRecord> {
  const normalized = normalizeFeedbackPayload(payload, source);
  const saved = await jsonFeedbackStore.saveFeedback(normalized);

  // FAZ 4F: learning candidate creation is now admin-controlled via bridge endpoint.

  return saved;
}

export async function listFeedback(options?: FeedbackListOptions): Promise<FeedbackRecord[]> {
  return jsonFeedbackStore.listFeedback(options);
}

export async function exportFeedbackDatasetJsonl(options: FeedbackExportOptions = {}): Promise<string> {
  const records = await listFeedback({ projectId: options.projectId });
  return exportFeedbackJsonl(records, options);
}
