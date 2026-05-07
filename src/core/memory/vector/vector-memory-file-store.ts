import { VectorMemoryEntry, VectorMemoryQuery, VectorMemorySearchResult, VectorStoreAdapter, VectorStoreDiagnostics } from './vector-memory-types';
import { appendJsonl, readJsonl, writeJsonl, getFileDiagnostics } from '../../storage/file-store';
import { randomUUID } from 'crypto';

const SENSITIVE_PATTERNS = [
  /api[-_]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
];

function sanitizeText(text: string): string {
  let sanitized = text;
  SENSITIVE_PATTERNS.forEach(p => {
    sanitized = sanitized.replace(new RegExp(p, 'gi'), '[REDACTED]');
  });
  return sanitized;
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorMemoryFileStore implements VectorStoreAdapter {
  private readonly filename = 'vector-memory.jsonl';

  addEntry(entry: Omit<VectorMemoryEntry, "entryId" | "createdAt"> & { entryId?: string }): { success: boolean; entry?: VectorMemoryEntry; warnings: string[] } {
    const warnings: string[] = [];
    
    // Sanitize
    const sanitizedText = sanitizeText(entry.text);
    if (sanitizedText !== entry.text) {
      warnings.push('Sensitive content detected and redacted from vector memory.');
    }

    const newEntry: VectorMemoryEntry = {
      ...entry,
      text: sanitizedText,
      entryId: entry.entryId || randomUUID(),
      createdAt: new Date().toISOString(),
    };

    appendJsonl(this.filename, newEntry);
    
    return { success: true, entry: newEntry, warnings };
  }

  search(query: VectorMemoryQuery): { success: boolean; results: VectorMemorySearchResult[]; warnings: string[]; diagnostics: VectorStoreDiagnostics } {
    const { lines, warnings: readWarnings } = readJsonl<VectorMemoryEntry>(this.filename);
    
    // Filter
    const candidates = lines.filter(l => l.projectId === query.projectId || (query.includeGlobal && l.memoryScope === 'global'));
    
    // Score
    const scored = candidates.map(c => ({
      entry: c,
      score: calculateCosineSimilarity(c.vector, query.vector)
    })).sort((a, b) => b.score - a.score);

    const limit = query.limit || 5;
    const results: VectorMemorySearchResult[] = scored.slice(0, limit).map(s => ({
      entryId: s.entry.entryId,
      projectId: s.entry.projectId,
      score: s.score,
      snippet: s.entry.text.substring(0, 200) + '...',
      source: s.entry.source,
      metadata: s.entry.metadata,
      attribution: s.entry.attribution
    }));

    return {
      success: true,
      results,
      warnings: readWarnings,
      diagnostics: this.getDiagnostics()
    };
  }

  list(projectId?: string): VectorMemoryEntry[] {
    const { lines } = readJsonl<VectorMemoryEntry>(this.filename);
    if (projectId) {
      return lines.filter(l => l.projectId === projectId);
    }
    return lines;
  }

  clear(): void {
    writeJsonl(this.filename, []);
  }

  getDiagnostics(): VectorStoreDiagnostics {
    const { lines } = readJsonl<VectorMemoryEntry>(this.filename);
    const projects = new Set(lines.map(l => l.projectId));
    return {
      totalEntries: lines.length,
      projectIds: Array.from(projects),
      placeholderStore: false,
      persistent: true as any // Overriding the strict false type
    };
  }
}

export const vectorMemoryStore = new VectorMemoryFileStore();
