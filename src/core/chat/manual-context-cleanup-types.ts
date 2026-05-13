/**
 * Manual Context Cleanup Types
 *
 * Contracts for safely removing visible manual context blocks from Chat draft.
 * No RAG, no retrieval, no memory writes, no path/secret leaks.
 */

export type ManualContextCleanupStatus =
  | "removed"
  | "not_found"
  | "ambiguous"
  | "invalid_boundary"
  | "no_action_needed";

export interface ManualContextCleanupWarning {
  severity: "info" | "warning" | "alert";
  code:
    | "context_not_found"
    | "unterminated_block"
    | "mismatched_markers"
    | "block_too_large"
    | "ambiguous_boundary"
    | "no_cleanup_needed";
  message: string;
}

export interface ManualContextCleanupResult {
  status: ManualContextCleanupStatus;
  cleanedDraft: string;
  removedBlockCount: number;
  originalLength: number;
  cleanedLength: number;
  warnings: ManualContextCleanupWarning[];
}

export const MANUAL_CONTEXT_CLEANUP_LIMITS = {
  maxDraftChars: 10000,
  maxWarningsShown: 5,
};

export const FORBIDDEN_CLEANUP_KEYS = [
  "removedRawBlock",
  "rawContext",
  "rawDraft",
  "fullPath",
  "canonicalPath",
  "absolutePath",
  "physicalPath",
  "userPath",
  "secret",
  "apiKey",
  "token",
  "password",
  "credential",
  "rawStdout",
  "rawStderr",
  "pid",
  "stackTrace",
  "hiddenPrompt",
  "systemPrompt",
];
