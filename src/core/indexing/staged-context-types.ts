import { CitationReference } from "./search-types";

export type StagedContextSource = "workspace_search";

export interface StagedContextWarning {
  code:
    | "duplicate_item"
    | "max_items"
    | "max_total_chars"
    | "unsafe_item_rejected"
    | "snippet_redacted"
    | "snippet_trimmed"
    | "invalid_result"
    | "manual_attach_empty"
    | "manual_attach_item_limit"
    | "manual_attach_item_skipped"
    | "manual_attach_total_trimmed";
  message: string;
  createdAt: number;
}

export interface StagedContextItem {
  stagedId: string;
  resultId: string;
  fileId: string;
  chunkId?: string;
  displayName: string;
  extension: string;
  snippet?: string;
  citation: CitationReference;
  addedAt: number;
  sourceType: StagedContextSource;
}

export interface StagedContextState {
  items: StagedContextItem[];
  totalChars: number;
  warnings: StagedContextWarning[];
  summaryPreview: string;
}

export const STAGED_CONTEXT_LIMITS = {
  maxItems: 10,
  maxSnippetCharsPerItem: 300,
  maxTotalChars: 2000,
  maxWarnings: 5,
};
