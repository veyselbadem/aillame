import { SearchResult } from "./search-types";
import {
  StagedContextItem,
  STAGED_CONTEXT_LIMITS,
  StagedContextWarning,
} from "./staged-context-types";
import { sanitizeSnippet } from "./search-sanitizer";
import { createCitation } from "./retrieval";

const FORBIDDEN_RESULT_KEYS = [
  "fullPath",
  "canonicalPath",
  "absolutePath",
  "physicalPath",
  "homePath",
  "userHomePath",
  "rawContent",
  "fullDocument",
  "stdout",
  "stderr",
  "pid",
  "stack",
  "stackTrace",
] as const;

const PATH_LIKE_PATTERN = /(\/home\/|\/Users\/|[a-zA-Z]:\\|\\\\|\/mnt\/|\.aillame-data)/gi;

function maskPathLikeText(input: string): string {
  return input.replace(PATH_LIKE_PATTERN, "[REDACTED_PATH]");
}

function sanitizeDisplayValue(input: string, fallback: string): string {
  const value = (input || "").trim();
  if (!value) return fallback;

  const basename = value.split(/[/\\]/).pop() || value;
  const masked = maskPathLikeText(basename);
  return masked.slice(0, 120) || fallback;
}

function sanitizeRootLabel(input: string): string {
  const label = (input || "").trim();
  if (!label) return "workspace";
  const masked = maskPathLikeText(label).replace(/[/\\]/g, "_");
  return masked.slice(0, 80) || "workspace";
}

function hasForbiddenResultShape(result: Record<string, unknown>): boolean {
  return FORBIDDEN_RESULT_KEYS.some((key) => key in result);
}

function makeWarning(
  code: StagedContextWarning["code"],
  message: string
): StagedContextWarning {
  return {
    code,
    message,
    createdAt: Date.now(),
  };
}

export function createSafeStagedItem(result: SearchResult): StagedContextItem | null {
  const prepared = createSafeStagedItemWithWarnings(result);
  return prepared.item;
}

export function createSafeStagedItemWithWarnings(result: SearchResult): {
  item: StagedContextItem | null;
  warnings: StagedContextWarning[];
} {
  const warnings: StagedContextWarning[] = [];
  const unknownResult = result as unknown as Record<string, unknown>;

  if (hasForbiddenResultShape(unknownResult)) {
    warnings.push(
      makeWarning(
        "unsafe_item_rejected",
        "Unsafe search result fields were detected. Item was not staged."
      )
    );
    return { item: null, warnings };
  }

  if (!result.displayName || !result.fileId || !result.resultId || !result.extension) {
    warnings.push(
      makeWarning("invalid_result", "Selected result is missing required safe fields.")
    );
    return { item: null, warnings };
  }

  let finalSnippet = result.snippet;
  if (finalSnippet) {
    const original = finalSnippet;
    const sanitized = sanitizeSnippet(original, STAGED_CONTEXT_LIMITS.maxSnippetCharsPerItem);
    finalSnippet = maskPathLikeText(sanitized.sanitized);

    if (sanitized.redacted || finalSnippet !== original) {
      warnings.push(
        makeWarning("snippet_redacted", "Snippet contained sensitive content and was redacted.")
      );
    }

    if (original.length > STAGED_CONTEXT_LIMITS.maxSnippetCharsPerItem) {
      warnings.push(
        makeWarning(
          "snippet_trimmed",
          `Snippet was trimmed to ${STAGED_CONTEXT_LIMITS.maxSnippetCharsPerItem} characters.`
        )
      );
    }
  }

  const rawCitation = createCitation(result);
  const citation = {
    fileId: rawCitation.fileId,
    chunkId: rawCitation.chunkId,
    displayName: sanitizeDisplayValue(rawCitation.displayName, "unknown-file"),
    startLine: rawCitation.startLine,
    endLine: rawCitation.endLine,
    rootLabel: sanitizeRootLabel(rawCitation.rootLabel),
  };

  const item: StagedContextItem = {
    stagedId: `staged-${Math.random().toString(36).slice(2, 10)}`,
    resultId: result.resultId,
    fileId: result.fileId,
    chunkId: result.chunkId,
    displayName: sanitizeDisplayValue(result.displayName, "unknown-file"),
    extension: sanitizeDisplayValue(result.extension, "unknown").replace(/[^a-zA-Z0-9._-]/g, ""),
    snippet: finalSnippet,
    citation,
    addedAt: Date.now(),
    sourceType: "workspace_search",
  };

  return {
    item,
    warnings,
  };
}

export function generateSafeStagedSummary(items: StagedContextItem[]): string {
  if (items.length === 0) return "No context staged.";
  
  let summary = `Staged Workspace Context (${items.length} items):\n\n`;
  for (const item of items) {
    const safeName = sanitizeDisplayValue(item.displayName, "unknown-file");
    const safeRoot = sanitizeRootLabel(item.citation.rootLabel);
    summary += `--- ${safeName} | ${safeRoot} | Lines ${item.citation.startLine || "?"}-${item.citation.endLine || "?"} ---\n`;
    if (item.snippet) {
      const boundedSnippet = item.snippet.slice(0, STAGED_CONTEXT_LIMITS.maxSnippetCharsPerItem);
      summary += `${maskPathLikeText(boundedSnippet)}\n`;
    }
    summary += `\n`;
  }
  return summary.slice(0, STAGED_CONTEXT_LIMITS.maxTotalChars).trim();
}
