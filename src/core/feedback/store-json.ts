import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { FeedbackRecord, FeedbackStore, FeedbackPayload } from './types';

const FEEDBACK_STORE_PATH = path.join(process.cwd(), 'feedback-store.json');

async function readFeedbackFile(): Promise<FeedbackRecord[]> {
  try {
    const raw = await readFile(FEEDBACK_STORE_PATH, 'utf-8');
    return JSON.parse(raw) as FeedbackRecord[];
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
  async saveFeedback(feedback: FeedbackPayload) {
    const records = await readFeedbackFile();
    const existingIndex = records.findIndex(
      (record) => record.conversationId === feedback.conversationId && record.messageId === feedback.messageId
    );
    const record: FeedbackRecord = {
      ...feedback,
      createdAt: Date.now(),
    };

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await writeFeedbackFile(records);
    return record;
  },

  async listFeedback() {
    return readFeedbackFile();
  },
};
