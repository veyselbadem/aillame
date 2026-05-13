import { IndexRecord, ChunkRecord } from "./index-types";
import { SearchQuery, SearchResult, MatchType } from "./search-types";
import { validateQuery, sanitizeSnippet } from "./search-sanitizer";
import { DEFAULT_SEARCH_POLICY } from "./search-policy";

// Basic in-memory search engine for indexed records.
export class WorkspaceSearchEngine {
  private indexRecords: Map<string, IndexRecord> = new Map();
  private chunkRecords: Map<string, ChunkRecord[]> = new Map(); // fileId -> chunks

  constructor() {}

  // Feed records into the in-memory engine.
  // In a real scenario, this might come from a DB or be populated during indexing.
  public feedIndex(records: IndexRecord[], chunks: ChunkRecord[]) {
    for (const record of records) {
      if (record.status === "indexed") {
        this.indexRecords.set(record.fileId, record);
      }
    }

    for (const chunk of chunks) {
      if (!this.chunkRecords.has(chunk.fileId)) {
        this.chunkRecords.set(chunk.fileId, []);
      }
      this.chunkRecords.get(chunk.fileId)!.push(chunk);
    }
  }

  public search(queryReq: SearchQuery): SearchResult[] {
    const validQuery = validateQuery(queryReq.query);
    if (!validQuery) {
      return []; // Empty query -> empty results
    }

    const queryLower = validQuery.toLowerCase();
    const limit = queryReq.limit || DEFAULT_SEARCH_POLICY.maxResults;
    const fileTypes = queryReq.fileTypes?.map(ext => ext.toLowerCase()) || [];
    const rootLabelFilter = queryReq.rootLabel;

    const results: SearchResult[] = [];

    for (const record of this.indexRecords.values()) {
      // Apply filters
      if (fileTypes.length > 0 && !fileTypes.includes(record.extension.toLowerCase())) {
        continue;
      }
      if (rootLabelFilter && record.rootLabel !== rootLabelFilter) {
        continue;
      }

      // Check file name match
      let score = 0;
      let matchType: MatchType | null = null;

      if (record.displayName.toLowerCase() === queryLower) {
        score += 10;
        matchType = "exact";
      } else if (record.displayName.toLowerCase().includes(queryLower)) {
        score += 5;
        matchType = "filename";
      }

      // If we have chunks, search content
      let bestChunkSnippet = "";
      let bestChunkMatchScore = 0;
      let matchedChunkId: string | undefined;
      let startLine: number | undefined;
      let endLine: number | undefined;

      const fileChunks = this.chunkRecords.get(record.fileId) || [];
      for (const chunk of fileChunks) {
        if (chunk.textPreview) {
          const textLower = chunk.textPreview.toLowerCase();
          if (textLower.includes(queryLower)) {
            // Found a match in this chunk
            // Basic scoring: count occurrences
            const occurrences = (textLower.match(new RegExp(this.escapeRegExp(validQuery), "gi")) || []).length;
            const chunkScore = occurrences * 2;

            if (chunkScore > bestChunkMatchScore) {
              bestChunkMatchScore = chunkScore;
              bestChunkSnippet = chunk.textPreview;
              matchedChunkId = chunk.chunkId;
              startLine = chunk.startLine;
              endLine = chunk.endLine;
            }
          }
        }
      }

      if (bestChunkMatchScore > 0) {
        score += bestChunkMatchScore;
        // Prioritize content match if no exact filename match
        if (matchType !== "exact") {
          matchType = "content";
        }
      }

      // If score is high enough, construct a result
      if (score >= DEFAULT_SEARCH_POLICY.minSearchScore && matchType) {
        let finalSnippet: string | undefined;
        let warnings: string[] = [];

        if (queryReq.includeSnippets && bestChunkSnippet) {
          const sanitized = sanitizeSnippet(bestChunkSnippet, queryReq.maxSnippetChars);
          finalSnippet = sanitized.sanitized;
          if (sanitized.redacted) {
            warnings.push("Snippet redacted due to sensitive content.");
          }
        }

        results.push({
          resultId: `res-${Math.random().toString(36).substring(2, 9)}`,
          fileId: record.fileId,
          chunkId: matchedChunkId,
          displayName: record.displayName,
          rootLabel: record.rootLabel,
          extension: record.extension,
          score,
          snippet: finalSnippet,
          startLine,
          endLine,
          matchType,
          warnings: warnings.length > 0 ? warnings : undefined,
        });
      }
    }

    // Sort by score descending and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  private escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
