import { jsonMemoryWriteLogStore } from './store-json';
import type { MemoryWriteLogRecord, CreateMemoryWriteLogInput } from './types';

export async function listMemoryWriteLogs(): Promise<MemoryWriteLogRecord[]> {
  return jsonMemoryWriteLogStore.listMemoryWriteLogs();
}

export async function createMemoryWriteLog(input: CreateMemoryWriteLogInput): Promise<MemoryWriteLogRecord> {
  return jsonMemoryWriteLogStore.createMemoryWriteLog(input);
}
