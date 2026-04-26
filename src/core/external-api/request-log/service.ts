import { createHash } from 'crypto';
import { jsonExternalApiRequestLogStore } from './store-json';
import type { ExternalApiRequestLogRecord } from './types';

export type CreateExternalApiRequestLogInput = Omit<ExternalApiRequestLogRecord, 'id' | 'createdAt'>;

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function createExternalApiRequestLog(input: CreateExternalApiRequestLogInput): Promise<ExternalApiRequestLogRecord> {
  const record: ExternalApiRequestLogRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    requestId: input.requestId,
    projectId: input.projectId,
    mode: input.mode,
    endpoint: input.endpoint,
    method: input.method,
    statusCode: input.statusCode,
    success: input.success,
    error: input.error,
    executionMode: input.executionMode,
    ipHash: input.ipHash ? hashValue(input.ipHash) : undefined,
    userAgent: input.userAgent,
    createdAt: Date.now(),
    durationMs: input.durationMs,
  };

  return jsonExternalApiRequestLogStore.appendExternalApiRequestLog(record);
}

export async function listExternalApiRequestLogs(): Promise<ExternalApiRequestLogRecord[]> {
  return jsonExternalApiRequestLogStore.listExternalApiRequestLogs();
}
