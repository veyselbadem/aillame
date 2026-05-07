import { documentLibraryStore } from "./document-file-store";
import { DocumentLibraryQuery, DocumentLibraryResult } from "./document-types";
import { vectorMemoryStore } from "../vector/vector-memory-file-store";

export class DocumentSearchService {
  async searchDocuments(query: DocumentLibraryQuery): Promise<DocumentLibraryResult[]> {
    const documents = await documentLibraryStore.listEntries(query.projectId);
    const activeDocs = documents.filter(d => 
      d.status === 'active' || 
      (query.includeDisabled && d.status === 'disabled')
    );

    // Metadata search simulation
    let results: DocumentLibraryResult[] = activeDocs
      .filter(d => !query.query || d.title.toLowerCase().includes(query.query.toLowerCase()))
      .map(d => ({
        documentId: d.documentId,
        projectId: d.projectId,
        title: d.title,
        snippet: "", // Populated from chunks in real retrieval
        score: 0.8,
        sourceType: d.sourceType,
        memoryScope: d.memoryScope,
        attribution: { sourceId: d.documentId, title: d.title }
      }));

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async getDocumentContext(documentId: string, projectId: string): Promise<string> {
    const entry = await documentLibraryStore.getEntry(documentId);
    if (!entry || entry.projectId !== projectId || entry.status !== 'active') {
      return "";
    }
    // In a real RAG system, this would retrieve specific chunks from vector memory
    // For foundation, we return a diagnostic placeholder
    return `Context from document: ${entry.title}`;
  }
}

export const documentSearchService = new DocumentSearchService();
