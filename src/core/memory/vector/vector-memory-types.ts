import type { MemoryAttribution } from "../attribution/memory-attribution-types";
import type { MemoryScope } from "../project-memory-types";

export type VectorMemoryEntry = {
  entryId: string;
  projectId: string;
  memoryScope: MemoryScope;
  vector: number[];
  text: string;
  source: {
    sourceId: string;
    sourceType: "document" | "project-memory" | "feedback" | "system" | "unknown";
    title?: string;
  };
  metadata: Record<string, unknown>;
  attribution: MemoryAttribution;
  createdAt: string;
};

export type VectorMemoryQuery = {
  projectId: string;
  memoryScope?: MemoryScope;
  vector: number[];
  queryText?: string;
  includeGlobal?: boolean;
  limit?: number;
};

export type VectorMemorySearchResult = {
  entryId: string;
  projectId: string;
  score: number;
  snippet: string;
  source: VectorMemoryEntry["source"];
  metadata: Record<string, unknown>;
  attribution: MemoryAttribution;
};

export type VectorStoreDiagnostics = {
  totalEntries: number;
  projectIds: string[];
  placeholderStore: boolean;
  persistent: false;
};

export type VectorStoreAdapter = {
  addEntry(entry: Omit<VectorMemoryEntry, "entryId" | "createdAt"> & { entryId?: string }): { success: boolean; entry?: VectorMemoryEntry; warnings: string[] };
  search(query: VectorMemoryQuery): { success: boolean; results: VectorMemorySearchResult[]; warnings: string[]; diagnostics: VectorStoreDiagnostics };
  list(projectId?: string): VectorMemoryEntry[];
  clear(): void;
  getDiagnostics(): VectorStoreDiagnostics;
};
