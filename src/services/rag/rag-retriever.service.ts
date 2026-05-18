import { VectorStoreService, VectorDocument } from "./vector-store.service";

/**
 * Faz 2.2: RAG Retriever Service
 * Searches for similar documents and formats them for the LLM.
 */
export class RagRetrieverService {
  /**
   * Retrieves relevant context for a given prompt.
   */
  static async retrieveContext(prompt: string, minScore: number = 0.65, limit: number = 3): Promise<VectorDocument[]> {
    try {
      console.log(`[RagRetriever] Searching context for: "${prompt.substring(0, 50)}..."`);
      const results = await VectorStoreService.searchSimilar(prompt, limit);
      
      // Filter by score
      const relevant = results.filter(r => (r.score || 0) >= minScore);
      
      console.log(`[RagRetriever] Found ${relevant.length} relevant documents.`);
      return relevant;
    } catch (error) {
      console.error("[RagRetriever] Error retrieving context:", error);
      return [];
    }
  }

  /**
   * Formats retrieved documents into a string suitable for system prompt injection.
   */
  static formatContext(documents: VectorDocument[]): string {
    if (documents.length === 0) return "";

    const header = "### EK BİLGİ (HAFIZA):\n";
    const body = documents.map((doc, i) => `[${i + 1}] ${doc.text}`).join("\n");
    return `${header}${body}\n\n`;
  }
}
