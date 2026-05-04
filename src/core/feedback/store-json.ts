import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { FeedbackListOptions, FeedbackRecord, FeedbackStore, FeedbackPayload } from './types';
import { normalizeFeedbackPayload } from './mappers';

const FEEDBACK_STORE_PATH = path.join(process.cwd(), 'feedback-store.json');

async function readFeedbackFile(): Promise<FeedbackRecord[]> {
  try {
    const raw = await readFile(FEEDBACK_STORE_PATH, 'utf-8');
    const normalizedRaw = raw.replace(/^\uFEFF/, '');
    const parsed = JSON.parse(normalizedRaw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => normalizeFeedbackPayload(item, 'unknown'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeFeedbackFile(records: FeedbackRecord[]): Promise<void> {
  await writeFile(FEEDBACK_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

export const jsonFeedbackStore: FeedbackStore = {
  async saveFeedback(feedback: FeedbackPayload | FeedbackRecord) {
    const records = await readFeedbackFile();
    const normalized = normalizeFeedbackPayload(feedback, 'unknown');
    const existingIndex = records.findIndex(
      (record) =>
        record.id === normalized.id ||
        (record.conversationId === normalized.conversationId && record.messageId === normalized.messageId)
    );
    const record: FeedbackRecord = {
      ...normalized,
      id: existingIndex >= 0 ? records[existingIndex].id : normalized.id,
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : normalized.createdAt,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await writeFeedbackFile(records);
    return record;
  },

  async listFeedback(options?: FeedbackListOptions) {
    const records = await readFeedbackFile();
    if (!options?.projectId) {
      return records;
    }

    return records.filter((record) => record.projectId === options.projectId);
  },
};
