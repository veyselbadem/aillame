import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { resolveProjectRelative } from '../project-root';
import type { MemoryWriteLogRecord, CreateMemoryWriteLogInput } from './types';

const MEMORY_WRITE_LOG_STORE_PATH = resolveProjectRelative('.aillame-data/logs/memory-write-log.json');

async function readLogFile(): Promise<MemoryWriteLogRecord[]> {
  try {
    const raw = await readFile(MEMORY_WRITE_LOG_STORE_PATH, 'utf-8');
    const normalizedRaw = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalizedRaw) as MemoryWriteLogRecord[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeLogFile(records: MemoryWriteLogRecord[]): Promise<void> {
  await writeFile(MEMORY_WRITE_LOG_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonMemoryWriteLogStore = {
  async createMemoryWriteLog(input: CreateMemoryWriteLogInput): Promise<MemoryWriteLogRecord> {
    const logs = await readLogFile();
    const record: MemoryWriteLogRecord = {
      id: generateId(),
      queueId: input.queueId,
      memoryCardId: input.memoryCardId,
      action: input.action,
      result: input.result,
      error: input.error,
      createdAt: Date.now(),
    };
    logs.push(record);
    await writeLogFile(logs);
    return record;
  },

  async listMemoryWriteLogs(): Promise<MemoryWriteLogRecord[]> {
    return readLogFile();
  },
};