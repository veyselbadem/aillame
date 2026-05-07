export type DocumentLibraryStatus = 'active' | 'disabled' | 'deleted' | 'rejected' | 'failed';
export type DocumentSourceType = 'manual' | 'upload' | 'paste' | 'generated' | 'unknown';
export type DocumentContentType = 'text/plain' | 'text/markdown' | 'application/json' | 'text/code' | 'unsupported';

export interface DocumentLibraryEntry {
  documentId: string;
  projectId: string;
  memoryScope: 'global' | 'project' | 'session';
  sourceApp?: string;
  title: string;
  sourceType: DocumentSourceType;
  contentType: DocumentContentType;
  status: DocumentLibraryStatus;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  safetyFlags: string[];
  chunkCount: number;
  contentHash?: string;
}

export interface DocumentLibraryQuery {
  projectId?: string;
  memoryScope?: string;
  query?: string;
  tags?: string[];
  limit?: number;
  includeDisabled?: boolean;
}

export interface DocumentLibraryResult {
  documentId: string;
  projectId: string;
  title: string;
  snippet: string;
  score: number;
  sourceType: DocumentSourceType;
  memoryScope: string;
  attribution: any;
}

export interface DocumentLibraryDiagnostics {
  totalDocuments: number;
  activeCount: number;
  disabledCount: number;
  chunkCount: number;
  lastIngestionAt?: number;
}
