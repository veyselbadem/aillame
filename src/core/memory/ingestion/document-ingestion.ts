import type { DocumentChunk, DocumentIngestionRequest, DocumentIngestionResult } from "./document-ingestion-types";

const SUPPORTED_MIME = new Set(["text/plain", "text/markdown", "application/json", "code/text"]);
const SENSITIVE_PATTERNS = [/\b(api[_-]?key|secret|token|password|credential)\b/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\.env(?:\.|$)/i];

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeText(value: string): string {
  return value.normalize("NFC").replace(/\r\n/g, "\n").trim();
}

export function ingestDocument(request: DocumentIngestionRequest): DocumentIngestionResult {
  const warnings: DocumentIngestionResult["warnings"] = [];
  const mimeType = request.source.mimeType;
  if (!SUPPORTED_MIME.has(mimeType)) {
    return {
      success: false,
      chunks: [],
      warnings: [{ code: "DOCUMENT_TYPE_NOT_SUPPORTED", message: `${mimeType} ingestion is not supported in this foundation phase.` }],
      diagnostics: { supported: false, duplicateCount: 0, chunkCount: 0, blocked: false },
    };
  }

  const content = normalizeText(request.content);
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(`${request.source.title ?? ""}\n${content}`))) {
    return {
      success: false,
      chunks: [],
      warnings: [{ code: "SENSITIVE_DOCUMENT_BLOCKED", message: "Sensitive-looking document content was blocked from ingestion." }],
      diagnostics: { supported: true, duplicateCount: 0, chunkCount: 0, blocked: true },
    };
  }

  const maxChars = Math.max(200, Math.min(request.maxChars ?? 1200, 8000));
  const overlapChars = Math.max(0, Math.min(request.overlapChars ?? 120, Math.floor(maxChars / 3)));
  const projectId = request.projectId ?? "general";
  const memoryScope = request.memoryScope ?? "project";
  const seen = new Set<string>();
  const chunks: DocumentChunk[] = [];

  for (let start = 0, index = 0; start < content.length; index += 1) {
    const end = Math.min(content.length, start + maxChars);
    const text = content.slice(start, end).trim();
    const contentHash = hashText(text.toLocaleLowerCase("tr-TR"));
    if (text && !seen.has(contentHash)) {
      seen.add(contentHash);
      chunks.push({
        chunkId: `doc_${request.source.sourceId}_${index}_${contentHash}`,
        sourceId: request.source.sourceId,
        projectId,
        memoryScope,
        chunkIndex: index,
        text,
        charStart: start,
        charEnd: end,
        contentHash,
        metadata: {
          projectId,
          sourceApp: request.sourceApp,
          memoryScope,
          createdAt: new Date().toISOString(),
        },
      });
    } else if (text) {
      warnings.push({ code: "DUPLICATE_CHUNK_SKIPPED", message: "Duplicate chunk skipped within the same source." });
    }
    if (end >= content.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return {
    success: true,
    chunks,
    warnings,
    diagnostics: {
      supported: true,
      duplicateCount: warnings.filter((warning) => warning.code === "DUPLICATE_CHUNK_SKIPPED").length,
      chunkCount: chunks.length,
      blocked: false,
    },
  };
}
