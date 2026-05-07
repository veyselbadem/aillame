export type EmbeddingRequest = {
  text: string;
  projectId?: string;
  modelId?: string;
  metadata?: Record<string, unknown>;
};

export type EmbeddingResult = {
  success: boolean;
  vector: number[];
  dimensions: number;
  provider: "placeholder" | "not-configured";
  warnings: string[];
  diagnostics: Record<string, unknown>;
};

export type EmbeddingProviderStatus = {
  status: "ready" | "not-configured" | "degraded";
  provider: "placeholder" | "external";
  dimensions: number;
  diagnostics: Record<string, unknown>;
};
