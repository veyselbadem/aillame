export interface SearchQuery {
  query: string;
  limit: number;
  fileTypes?: string[];
  rootLabel?: string;
  includeSnippets?: boolean;
  maxSnippetChars?: number;
}

export type MatchType = "filename" | "extension" | "content" | "exact";

export interface SearchResult {
  resultId: string;
  fileId: string;
  chunkId?: string;
  displayName: string;
  rootLabel: string;
  extension: string;
  score: number;
  snippet?: string;
  startLine?: number;
  endLine?: number;
  matchType: MatchType;
  warnings?: string[];
}

export interface CitationReference {
  fileId: string;
  chunkId?: string;
  displayName: string;
  startLine?: number;
  endLine?: number;
  rootLabel: string;
}

export interface SearchOptions {
  maxResults?: number;
  minScore?: number;
}
