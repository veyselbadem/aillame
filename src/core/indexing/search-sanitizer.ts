import { DEFAULT_SEARCH_POLICY } from "./search-policy";

export function validateQuery(query: string): string | null {
  if (!query || query.trim().length === 0) {
    return null; // Empty query
  }

  const trimmed = query.trim();
  if (trimmed.length > DEFAULT_SEARCH_POLICY.maxQueryLength) {
    return trimmed.substring(0, DEFAULT_SEARCH_POLICY.maxQueryLength);
  }

  return trimmed;
}

export function sanitizeSnippet(snippet: string, maxChars?: number): { sanitized: string, redacted: boolean } {
  let redacted = false;
  let text = snippet;

  const limit = Math.min(
    maxChars || DEFAULT_SEARCH_POLICY.maxSnippetChars,
    DEFAULT_SEARCH_POLICY.maxSnippetChars
  );

  if (text.length > limit) {
    text = text.substring(0, limit) + "...";
  }

  // Redact path-like patterns
  for (const pattern of DEFAULT_SEARCH_POLICY.pathLikePatterns) {
    if (pattern.test(text)) {
      text = text.replace(new RegExp(pattern, "gi"), "[REDACTED_PATH]");
      redacted = true;
    }
  }

  // Redact sensitive patterns
  for (const pattern of DEFAULT_SEARCH_POLICY.sensitivePatterns) {
    if (pattern.test(text)) {
      text = text.replace(new RegExp(pattern, "gi"), "[REDACTED_SECRET]");
      redacted = true;
    }
  }

  return { sanitized: text, redacted };
}

export function isQuerySensitive(query: string): boolean {
  for (const pattern of DEFAULT_SEARCH_POLICY.sensitivePatterns) {
    if (pattern.test(query)) {
      return true;
    }
  }
  return false;
}
