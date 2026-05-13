export type IndexingStatus = "pending" | "indexed" | "skipped" | "failed";

export type SkippedReason =
  | "denylisted_extension"
  | "denylisted_directory"
  | "binary_content"
  | "file_too_large"
  | "sensitive_content"
  | "empty_file"
  | "io_error";

export interface IndexRecord {
  fileId: string;
  rootLabel: string;
  displayName: string;
  extension: string;
  sizeBytes: number;
  modifiedAt?: number;
  chunkCount: number;
  status: IndexingStatus;
  skippedReason?: SkippedReason;
}

export interface ChunkRecord {
  chunkId: string;
  fileId: string;
  chunkIndex: number;
  textPreview?: string;
  startLine?: number;
  endLine?: number;
  tokenEstimate?: number;
}

export interface IndexingPolicy {
  maxFileSizeBytes: number;
  maxTotalBytes: number;
  maxFiles: number;
  maxChunkChars: number;
  allowlistedExtensions: string[];
  denylistedDirectories: string[];
  denylistedFiles: string[];
}

export interface IndexingResult {
  totalFiles: number;
  indexedFiles: number;
  skippedFiles: number;
  totalBytes: number;
  records: IndexRecord[];
}
