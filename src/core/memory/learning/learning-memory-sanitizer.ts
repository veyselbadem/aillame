import type { AillameLearningMemoryCreateInput, AillameLearningMemoryEntry } from "./learning-memory-types";

const SECRET_PATTERNS = [
  /(api[_-]?key|token|secret|password|passwd|credential)\s*[:=]\s*["']?[^"'\s]+/gi,
  /(bearer)\s+[a-z0-9._~+/-]+=*/gi,
  /([a-z0-9]{24,}\.[a-z0-9._-]{12,}\.[a-z0-9._-]{12,})/gi,
  /(sk-[a-z0-9]{16,})/gi,
  /([a-f0-9]{32,})/gi,
];

const MAX_TEXT_LENGTH = 1000;
const MAX_ARRAY_ITEMS = 20;

function sanitizeText(value: string): string {
  const redacted = SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[REDACTED_SECRET]"),
    value
  );
  return redacted.length > MAX_TEXT_LENGTH ? `${redacted.slice(0, MAX_TEXT_LENGTH)}...` : redacted;
}

function sanitizeStringArray(values: readonly string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => sanitizeText(value).trim())
    .filter(Boolean)
    .slice(0, MAX_ARRAY_ITEMS);
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (/secret|token|password|credential|api[_-]?key/i.test(key)) {
      result[key] = "[REDACTED_SECRET]";
      continue;
    }
    if (typeof value === "string") {
      result[key] = sanitizeText(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeText(item))
        .slice(0, MAX_ARRAY_ITEMS);
    } else {
      result[key] = "[UNSUPPORTED_METADATA_REDACTED]";
    }
  }

  return result;
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}

export function sanitizeLearningMemoryCreateInput(
  input: AillameLearningMemoryCreateInput
): Omit<AillameLearningMemoryEntry, "id" | "createdAt" | "updatedAt"> {
  return {
    projectId: sanitizeText(input.projectId ?? "default"),
    source: input.source,
    category: sanitizeText(input.category ?? "unknown"),
    title: sanitizeText(input.title),
    summary: sanitizeText(input.summary),
    problemSignature: input.problemSignature ? sanitizeText(input.problemSignature) : undefined,
    errorPatterns: sanitizeStringArray(input.errorPatterns),
    likelyCauses: sanitizeStringArray(input.likelyCauses),
    recommendedFixes: sanitizeStringArray(input.recommendedFixes),
    relatedFiles: sanitizeStringArray(input.relatedFiles),
    commandsToTry: sanitizeStringArray(input.commandsToTry),
    commandsToAvoid: sanitizeStringArray(input.commandsToAvoid),
    safetyNotes: sanitizeStringArray(input.safetyNotes),
    outcome: input.outcome ?? "unknown",
    confidence: clampConfidence(input.confidence),
    tags: sanitizeStringArray(input.tags).map((tag) => tag.toLocaleLowerCase("en-US")),
    metadata: sanitizeMetadata(input.metadata),
  };
}
