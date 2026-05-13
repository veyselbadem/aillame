import { IndexRecord, ChunkRecord } from "./index-types";

export interface IndexStats {
  indexedFiles: number;
  skippedFiles: number;
  indexedChunks: number;
  totalBytesRead: number;
  warningsCount: number;
}

export type IndexSessionStatus = "idle" | "building" | "ready" | "failed";

export class WorkspaceIndexSession {
  public status: IndexSessionStatus = "idle";
  public records: IndexRecord[] = [];
  public chunks: ChunkRecord[] = [];
  public warnings: string[] = [];
  public lastBuiltAt: number | null = null;
  public stats: IndexStats = {
    indexedFiles: 0,
    skippedFiles: 0,
    indexedChunks: 0,
    totalBytesRead: 0,
    warningsCount: 0,
  };

  public reset() {
    this.status = "idle";
    this.records = [];
    this.chunks = [];
    this.warnings = [];
    this.lastBuiltAt = null;
    this.stats = {
      indexedFiles: 0,
      skippedFiles: 0,
      indexedChunks: 0,
      totalBytesRead: 0,
      warningsCount: 0,
    };
  }

  public addWarning(message: string) {
    this.warnings.push(message);
    this.stats.warningsCount = this.warnings.length;
  }
}

// Global in-memory session (no persistent storage)
export const globalIndexSession = new WorkspaceIndexSession();
