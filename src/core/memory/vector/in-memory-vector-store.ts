import { createMemoryAttribution } from "../attribution/memory-attribution-types";
import type { VectorMemoryEntry, VectorMemoryQuery, VectorMemorySearchResult, VectorStoreAdapter, VectorStoreDiagnostics } from "./vector-memory-types";

const SENSITIVE_PATTERNS = [/\b(api[_-]?key|secret|token|password|credential)\b/i, /\.env(?:\.|$)/i];

function makeId(): string {
  return `vec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cosine(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export class InMemoryVectorStore implements VectorStoreAdapter {
  private readonly entries: VectorMemoryEntry[] = [];

  addEntry(input: Omit<VectorMemoryEntry, "entryId" | "createdAt"> & { entryId?: string }) {
    const serialized = `${input.text}\n${JSON.stringify(input.metadata)}\n${input.source.title ?? ""}`;
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(serialized))) {
      return { success: false, warnings: ["Sensitive-looking content was blocked from vector memory."] };
    }

    const entry: VectorMemoryEntry = {
      ...input,
      entryId: input.entryId ?? makeId(),
      createdAt: new Date().toISOString(),
      attribution: input.attribution ?? createMemoryAttribution({
        sourceId: input.source.sourceId,
        sourceType: "vector-memory",
        projectId: input.projectId,
        memoryScope: input.memoryScope,
        title: input.source.title,
        snippet: input.text,
      }),
    };
    this.entries.push(entry);
    return { success: true, entry, warnings: [] };
  }

  search(query: VectorMemoryQuery) {
    const limit = Math.max(1, Math.min(query.limit ?? 5, 25));
    const results: VectorMemorySearchResult[] = this.entries
      .filter((entry) => {
        if (entry.memoryScope === "global") return query.includeGlobal === true;
        return entry.projectId === query.projectId && (!query.memoryScope || entry.memoryScope === query.memoryScope);
      })
      .map((entry) => ({
        entry,
        score: cosine(entry.vector, query.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ entry, score }) => ({
        entryId: entry.entryId,
        projectId: entry.projectId,
        score: Number(score.toFixed(6)),
        snippet: entry.text.slice(0, 240),
        source: entry.source,
        metadata: entry.metadata,
        attribution: entry.attribution,
      }));

    return {
      success: true,
      results,
      warnings: query.includeGlobal ? ["Global vector memory was explicitly included."] : [],
      diagnostics: this.getDiagnostics(),
    };
  }

  list(projectId?: string): VectorMemoryEntry[] {
    return projectId ? this.entries.filter((entry) => entry.projectId === projectId) : [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }

  getDiagnostics(): VectorStoreDiagnostics {
    return {
      totalEntries: this.entries.length,
      projectIds: Array.from(new Set(this.entries.map((entry) => entry.projectId))).sort(),
      placeholderStore: true,
      persistent: false,
    };
  }
}
