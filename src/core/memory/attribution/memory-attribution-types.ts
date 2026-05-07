import type { MemoryScope } from "../project-memory-types";

export type AttributionSource = "project-memory" | "vector-memory" | "document" | "document-chunk" | "knowledge-base" | "feedback" | "system" | "unknown";
export type AttributionConfidence = "low" | "medium" | "high";
export type AttributionScope = MemoryScope;

export type AttributionDiagnostics = {
  previewOnly?: boolean;
  warnings?: string[];
  sourceAvailable?: boolean;
};

export type MemoryAttribution = {
  sourceId: string;
  sourceType: AttributionSource;
  projectId: string;
  memoryScope: AttributionScope;
  title?: string;
  snippet?: string;
  confidence: AttributionConfidence;
  usedAt: string;
  diagnostics: AttributionDiagnostics;
};

export function createMemoryAttribution(input: {
  sourceId: string;
  sourceType: AttributionSource;
  projectId?: string;
  memoryScope?: AttributionScope;
  title?: string;
  snippet?: string;
  confidence?: AttributionConfidence;
  diagnostics?: AttributionDiagnostics;
}): MemoryAttribution {
  return {
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    projectId: input.projectId ?? "general",
    memoryScope: input.memoryScope ?? "project",
    title: input.title,
    snippet: input.snippet?.slice(0, 240),
    confidence: input.confidence ?? "medium",
    usedAt: new Date().toISOString(),
    diagnostics: input.diagnostics ?? { previewOnly: true },
  };
}
