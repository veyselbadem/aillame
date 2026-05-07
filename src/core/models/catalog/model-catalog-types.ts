import type { ModelCompatibilityReport } from "../compatibility/model-compatibility";

export type ModelCatalogSource = "curated" | "local" | "manual" | "remote" | "unknown";
export type ModelCatalogFormat = "gguf" | "safetensors" | "onnx" | "unknown";
export type ModelCatalogTaskType = "chat" | "completion" | "code" | "analysis" | "unknown";

export interface ModelCatalogFile {
  fileName: string;
  format: ModelCatalogFormat;
  quantization?: string;
  parameterSize?: string;
  sizeBytes?: number;
  downloadUrl?: string;
  checksum?: string;
  recommended: boolean;
  warnings: string[];
}

export interface ModelCatalogEntry {
  modelId: string;
  displayName: string;
  provider: string;
  family: string;
  taskType: ModelCatalogTaskType;
  format: ModelCatalogFormat;
  source: ModelCatalogSource;
  files: ModelCatalogFile[];
  license?: string;
  tags: string[];
  updatedAt?: string;
  downloads?: number;
  compatibility: Pick<ModelCompatibilityReport, "score" | "summary" | "hardwareFit" | "runtimeCompatibility" | "warnings" | "nextAction">;
  recommendedUse: string;
  warnings: string[];
}

export interface ModelCatalogQuery {
  format?: ModelCatalogFormat;
  family?: string;
  maxParameterSize?: string;
  recommendedOnly?: boolean;
  offline?: boolean;
}

export interface ModelCatalogDiagnostics {
  source: ModelCatalogSource;
  offline: boolean;
  networkRequired: boolean;
  warnings: string[];
  generatedAt: string;
}

export interface ModelCatalogResult {
  success: boolean;
  entries: ModelCatalogEntry[];
  diagnostics: ModelCatalogDiagnostics;
}
