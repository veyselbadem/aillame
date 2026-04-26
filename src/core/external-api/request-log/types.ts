import type { ExternalApiMode, ExternalProjectId } from '../types';

export type ExternalApiRequestLogStatus = 'success' | 'error' | 'rate_limited';

export type ExternalApiRequestLogRecord = {
  id: string;
  requestId?: string;
  projectId?: ExternalProjectId;
  mode?: ExternalApiMode;
  endpoint: string;
  method: string;
  statusCode: number;
  success: boolean;
  error?: string;
  executionMode?: 'planning_only' | 'model_execution';
  ipHash?: string;
  userAgent?: string;
  createdAt: number;
  durationMs?: number;
};

export type ExternalApiRequestLogStore = {
  readExternalApiRequestLogs(): Promise<ExternalApiRequestLogRecord[]>;
  writeExternalApiRequestLogs(records: ExternalApiRequestLogRecord[]): Promise<void>;
  appendExternalApiRequestLog(record: ExternalApiRequestLogRecord): Promise<ExternalApiRequestLogRecord>;
  listExternalApiRequestLogs(): Promise<ExternalApiRequestLogRecord[]>;
};
