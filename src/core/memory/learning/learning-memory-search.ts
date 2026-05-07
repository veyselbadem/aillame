import type {
  AillameLearningMemoryEntry,
  AillameLearningMemorySearchInput,
  AillameLearningMemorySearchResult,
} from "./learning-memory-types";

function tokenize(value: string): string[] {
  return value
    .toLocaleLowerCase("en-US")
    .split(/[^a-z0-9_-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function haystack(entry: AillameLearningMemoryEntry): string {
  return [
    entry.title,
    entry.summary,
    entry.category,
    entry.problemSignature,
    entry.errorPatterns.join(" "),
    entry.likelyCauses.join(" "),
    entry.recommendedFixes.join(" "),
    entry.relatedFiles.join(" "),
    entry.tags.join(" "),
  ].filter(Boolean).join(" ");
}

function scoreEntry(entry: AillameLearningMemoryEntry, input: AillameLearningMemorySearchInput): number {
  let score = 0;

  if (input.projectId && entry.projectId === input.projectId) score += 3;
  if (input.category && entry.category === input.category) score += 2;
  if (input.tags && input.tags.some((tag) => entry.tags.includes(tag.toLocaleLowerCase("en-US")))) score += 1.5;

  const queryTokens = tokenize(input.query ?? "");
  const entryTokens = new Set(tokenize(haystack(entry)));
  for (const token of queryTokens) {
    if (entryTokens.has(token)) score += 1;
  }

  return score;
}

export function searchLearningMemoryEntries(
  entries: readonly AillameLearningMemoryEntry[],
  input: AillameLearningMemorySearchInput
): AillameLearningMemorySearchResult {
  const limit = Math.min(50, Math.max(1, input.limit ?? 10));
  const matches = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, input) }))
    .filter(({ entry, score }) => {
      if (input.projectId && entry.projectId !== input.projectId) return false;
      if (input.category && entry.category !== input.category) return false;
      if (input.tags && input.tags.length > 0 && !input.tags.some((tag) => entry.tags.includes(tag.toLocaleLowerCase("en-US")))) return false;
      return score > 0 || (!input.query && !input.projectId && !input.category && !input.tags?.length);
    })
    .sort((a, b) => b.score - a.score || b.entry.updatedAt.localeCompare(a.entry.updatedAt))
    .slice(0, limit)
    .map(({ entry }) => entry);

  return {
    success: true,
    matches,
    total: matches.length,
  };
}
