import path from 'path';

export interface StorageDiagnostics {
  rootPath: string;
  isAvailable: boolean;
  isWritable: boolean;
  warnings: string[];
}

export interface BackupRequest {
  targetPath?: string;
  includeAudit?: boolean;
  includeVector?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
  timestamp: number;
}

export interface RestoreRequest {
  sourcePath: string;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
}

export interface DeletePolicy {
  softDeleteDefault: boolean;
  allowHardDelete: boolean;
  retentionDays?: number;
}

export const DEFAULT_DELETE_POLICY: DeletePolicy = {
  softDeleteDefault: true,
  allowHardDelete: false, // requires approval or dangerous flag
};
