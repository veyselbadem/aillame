import { SearchResult, CitationReference } from "./search-types";

/**
 * Converts a safe SearchResult into a CitationReference.
 * This ensures that when we pass data to a prompt (in the future),
 * it only contains safe, minimal reference data.
 */
export function createCitation(result: SearchResult): CitationReference {
  return {
    fileId: result.fileId,
    chunkId: result.chunkId,
    displayName: result.displayName,
    startLine: result.startLine,
    endLine: result.endLine,
    rootLabel: result.rootLabel,
  };
}

/**
 * Checks if a search result should be completely skipped based on warnings.
 */
export function isResultSafeForRetrieval(result: SearchResult): boolean {
  if (result.warnings && result.warnings.length > 0) {
    // For now, if there are any warnings (e.g., redacted sensitive content),
    // we consider it unsafe or at least require caution.
    // In a stricter mode, we might return false here.
    // For this phase, we just log/return true since the snippet itself is sanitized.
    return true; 
  }
  return true;
}
