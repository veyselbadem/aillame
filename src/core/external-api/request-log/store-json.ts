import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { ExternalApiRequestLogRecord } from './types';

const REQUEST_LOG_STORE_PATH = path.join(process.cwd(), 'external-api-request-log.json');

async function readRequestLogFile(): Promise<ExternalApiRequestLogRecord[]> {
  try {
    const raw = await readFile(REQUEST_LOG_STORE_PATH, 'utf-8');
    const normalized = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalized) as ExternalApiRequestLogRecord[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeRequestLogFile(records: ExternalApiRequestLogRecord[]): Promise<void> {
  await writeFile(REQUEST_LOG_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonExternalApiRequestLogStore = {
  async readExternalApiRequestLogs(): Promise<ExternalApiRequestLogRecord[]> {
    return readRequestLogFile();
  },

  async writeExternalApiRequestLogs(records: ExternalApiRequestLogRecord[]): Promise<void> {
    await writeRequestLogFile(records);
  },

  async appendExternalApiRequestLog(record: ExternalApiRequestLogRecord): Promise<ExternalApiRequestLogRecord> {
    const records = await readRequestLogFile();
    const logRecord: ExternalApiRequestLogRecord = {
      ...record,
      id: record.id ?? generateId(),
      createdAt: record.createdAt ?? Date.now(),
    } as ExternalApiRequestLogRecord;
    records.push(logRecord);
    await writeRequestLogFile(records);
    return logRecord;
  },

  async listExternalApiRequestLogs(): Promise<ExternalApiRequestLogRecord[]> {
    return readRequestLogFile();
  },
};
