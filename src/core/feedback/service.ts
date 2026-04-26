import { jsonFeedbackStore } from './store-json';
import { createOrUpdateCandidateFromFeedback } from '@core/learning-candidates/service';
import type { FeedbackPayload, FeedbackRecord } from './types';

export async function saveFeedback(payload: FeedbackPayload): Promise<FeedbackRecord> {
  const saved = await jsonFeedbackStore.saveFeedback(payload);

  try {
    await createOrUpdateCandidateFromFeedback(saved);
  } catch (error) {
    console.error('[Learning Candidate] candidate üretilirken hata oluştu:', error);
  }

  return saved;
}

export async function listFeedback(): Promise<FeedbackRecord[]> {
  return jsonFeedbackStore.listFeedback();
}
