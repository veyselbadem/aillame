import { DocumentLibraryEntry } from "./document-types";
import { DocumentChunk } from "../ingestion/document-ingestion-types";

export interface ChunkingOptions {
  maxChars: number;
  overlapChars: number;
}

export class DocumentChunker {
  static chunk(content: string, document: DocumentLibraryEntry, options: ChunkingOptions): DocumentChunk[] {
    const { maxChars, overlapChars } = options;
    const chunks: DocumentChunk[] = [];
    const seen = new Set<string>();

    for (let start = 0, index = 0; start < content.length; index += 1) {
      const end = Math.min(content.length, start + maxChars);
      const text = content.slice(start, end).trim();
      const contentHash = this.hashText(text.toLowerCase());

      if (text && !seen.has(contentHash)) {
        seen.add(contentHash);
        chunks.push({
          chunkId: `${document.documentId}_${index}`,
          sourceId: document.documentId,
          projectId: document.projectId,
          memoryScope: document.memoryScope,
          chunkIndex: index,
          text,
          charStart: start,
          charEnd: end,
          contentHash,
          metadata: {
            projectId: document.projectId,
            memoryScope: document.memoryScope,
            documentTitle: document.title,
            createdAt: new Date().toISOString()
          }
        });
      }

      if (end >= content.length) break;
      start = Math.max(end - overlapChars, start + 1);
    }

    return chunks;
  }

  private static hashText(value: string): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}
