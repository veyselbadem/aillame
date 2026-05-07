import type { MemoryScope } from "../project-memory-types";

export type DocumentSource = {
  sourceId: string;
  sourceType: "text" | "markdown" | "json" | "code" | "pdf" | "docx" | "unknown";
  title?: string;
  mimeType: string;
};

export type DocumentMetadata = {
  projectId: string;
  sourceApp?: string;
  memoryScope: MemoryScope;
  createdAt: string;
  tags?: string[];
};

export type DocumentChunk = {
  chunkId: string;
  sourceId: string;
  projectId: string;
  memoryScope: MemoryScope;
  chunkIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
  contentHash: string;
  metadata: DocumentMetadata;
};

export type DocumentIngestionWarning = {
  code: string;
  message: string;
};

export type DocumentIngestionDiagnostics = {
  supported: boolean;
  duplicateCount: number;
  chunkCount: number;
  blocked: boolean;
};

export type DocumentIngestionRequest = {
  projectId?: string;
  sourceApp?: string;
  memoryScope?: MemoryScope;
  source: DocumentSource;
  content: string;
  maxChars?: number;
  overlapChars?: number;
};

export type DocumentIngestionResult = {
  success: boolean;
  chunks: DocumentChunk[];
  warnings: DocumentIngestionWarning[];
  diagnostics: DocumentIngestionDiagnostics;
};
