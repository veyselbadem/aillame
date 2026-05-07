import { documentLibraryStore } from "../documents/document-file-store";
import { DocumentChunker } from "../documents/document-chunker";
import { DocumentLibraryEntry, DocumentContentType } from "../documents/document-types";
import { vectorMemoryStore } from "../vector/vector-memory-file-store";
import { auditLogStore } from "../../security/audit-file-store";
import { createMemoryAttribution } from "../attribution/memory-attribution-types";

export interface IngestionRequest {
  projectId: string;
  memoryScope: 'global' | 'project' | 'session';
  title: string;
  content: string;
  contentType: DocumentContentType;
  sourceApp?: string;
  tags?: string[];
}

export class DocumentIngestionService {
  private SENSITIVE_PATTERNS = [
    /\b(api[_-]?key|secret|token|password|credential)\b/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\.env(?:\.|$)/i
  ];

  async ingest(request: IngestionRequest): Promise<{ success: boolean; documentId?: string; warning?: string }> {
    // 1. Safety Guard
    if (this.SENSITIVE_PATTERNS.some(p => p.test(request.content) || p.test(request.title))) {
      return { success: false, warning: "Sensitive content detected and blocked." };
    }

    // 2. Format Support
    if (request.contentType === 'unsupported') {
      return { success: false, warning: "Unsupported content type." };
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    // 3. Create Entry
    const entry: DocumentLibraryEntry = {
      documentId,
      projectId: request.projectId,
      memoryScope: request.memoryScope,
      sourceApp: request.sourceApp,
      title: request.title,
      sourceType: 'manual',
      contentType: request.contentType,
      status: 'active',
      tags: request.tags || [],
      metadata: { ingestedAt: Date.now() },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      safetyFlags: [],
      chunkCount: 0
    };

    // 4. Chunking
    const chunks = DocumentChunker.chunk(request.content, entry, { maxChars: 1000, overlapChars: 100 });
    entry.chunkCount = chunks.length;

    // 5. Store Entry & Chunks
    await documentLibraryStore.addEntry(entry);
    for (const chunk of chunks) {
      await vectorMemoryStore.addEntry({
        projectId: chunk.projectId,
        memoryScope: chunk.memoryScope,
        text: chunk.text,
        vector: [], // Placeholder vector
        source: {
          sourceId: chunk.sourceId,
          sourceType: 'document',
          title: entry.title
        },
        metadata: { ...chunk.metadata },
        attribution: createMemoryAttribution({
          sourceId: chunk.chunkId,
          sourceType: 'document-chunk',
          projectId: chunk.projectId,
          memoryScope: chunk.memoryScope,
          title: entry.title,
          snippet: chunk.text.slice(0, 100)
        })
      });
    }

    // 6. Audit
    auditLogStore.log({
      action: 'document.ingest',
      status: 'success',
      metadata: { documentId, projectId: request.projectId, chunkCount: chunks.length }
    });

    return { success: true, documentId };
  }
}

export const documentIngestionService = new DocumentIngestionService();
