import type { EmbeddingProviderStatus, EmbeddingRequest, EmbeddingResult } from "./embedding-types";

const DIMENSIONS = 32;
const SENSITIVE_PATTERNS = [/\b(api[_-]?key|secret|token|password|credential)\b/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];

export function getPlaceholderEmbeddingStatus(): EmbeddingProviderStatus {
  return {
    status: "degraded",
    provider: "placeholder",
    dimensions: DIMENSIONS,
    diagnostics: {
      deterministic: true,
      realEmbeddingModel: false,
      vectorDbDependency: false,
    },
  };
}

export function createPlaceholderEmbedding(request: EmbeddingRequest): EmbeddingResult {
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(request.text))) {
    return {
      success: false,
      vector: [],
      dimensions: 0,
      provider: "placeholder",
      warnings: ["Sensitive-looking text was blocked from embedding."],
      diagnostics: { blocked: true, reasonCode: "SENSITIVE_CONTENT_BLOCKED" },
    };
  }

  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  const normalized = request.text.normalize("NFC").toLocaleLowerCase("tr-TR");
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    vector[i % DIMENSIONS] += (code % 97) / 97;
  }
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  const scaled = vector.map((item) => Number((item / norm).toFixed(6)));

  return {
    success: true,
    vector: scaled,
    dimensions: DIMENSIONS,
    provider: "placeholder",
    warnings: ["Placeholder embedding is deterministic and not semantic."],
    diagnostics: { blocked: false, projectId: request.projectId ?? "general" },
  };
}
