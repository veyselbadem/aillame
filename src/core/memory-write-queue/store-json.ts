import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { MemoryWriteQueueRecord, CreateMemoryWriteQueueInput, MemoryWriteQueueStatus } from './types';

const MEMORY_WRITE_QUEUE_STORE_PATH = path.join(process.cwd(), 'memory-write-queue-store.json');

async function readQueueFile(): Promise<MemoryWriteQueueRecord[]> {
  try {
    const raw = await readFile(MEMORY_WRITE_QUEUE_STORE_PATH, 'utf-8');
    const normalizedRaw = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalizedRaw) as MemoryWriteQueueRecord[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeQueueFile(records: MemoryWriteQueueRecord[]): Promise<void> {
  await writeFile(MEMORY_WRITE_QUEUE_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

async function getQueueRecordById(id: string): Promise<MemoryWriteQueueRecord | undefined> {
  const records = await readQueueFile();
  return records.find((item) => item.id === id);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonMemoryWriteQueueStore = {
  async upsertQueueRecord(input: CreateMemoryWriteQueueInput): Promise<MemoryWriteQueueRecord> {
    const records = await readQueueFile();
    const now = Date.now();
    const existingIndex = records.findIndex((item) => item.sourcePreviewId === input.sourcePreviewId);

    const record: MemoryWriteQueueRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : generateId(),
      sourcePreviewId: input.sourcePreviewId,
      sourceCandidateId: input.sourceCandidateId,
      sourceFeedbackId: input.sourceFeedbackId,
      targetMemoryScope: input.targetMemoryScope,
      targetMode: input.targetMode,
      title: input.title,
      summary: input.summary,
      keywords: input.keywords,
      riskLevel: input.riskLevel,
      confidenceScore: input.confidenceScore,
      status: input.status ?? (existingIndex >= 0 ? records[existingIndex].status : 'pending_write'),
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await writeQueueFile(records);
    return record;
  },

  async listQueueRecords(): Promise<MemoryWriteQueueRecord[]> {
    return readQueueFile();
  },

  async updateQueueRecordStatus(id: string, status: MemoryWriteQueueStatus): Promise<MemoryWriteQueueRecord | undefined> {
    const records = await readQueueFile();
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) return undefined;

    records[index] = {
      ...records[index],
      status,
      updatedAt: Date.now(),
    };

    await writeQueueFile(records);
    return records[index];
  },

  async getQueueRecordById(id: string): Promise<MemoryWriteQueueRecord | undefined> {
    return getQueueRecordById(id);
  },
};
