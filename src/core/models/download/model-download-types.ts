import type { ModelCatalogEntry, ModelCatalogFile } from "../catalog/model-catalog-types";

export type ModelDownloadRisk = "license" | "disk-space" | "network" | "path" | "compatibility" | "manual-source";
export type ModelDownloadJobStatus =
  | "planned"
  | "waiting-approval"
  | "approved"
  | "downloading"
  | "completed"
  | "failed"
  | "cancelled"
  | "manual-required";

export interface ModelDownloadTarget {
  targetDirectory: string;
  targetFile: string;
  sanitizedTargetFile: string;
}

export interface ModelDownloadPlan {
  modelId: string;
  fileName: string;
  sourceProvider: string;
  downloadUrl?: string;
  targetDirectory: string;
  targetFile: string;
  estimatedSizeBytes?: number;
  license?: string;
  compatibility: ModelCatalogEntry["compatibility"];
  diskSpaceStatus: "ok" | "warning" | "insufficient" | "unknown";
  approvalRequired: boolean;
  canAutoStart: false;
  risks: ModelDownloadRisk[];
  nextActions: string[];
  diagnostics: ModelDownloadDiagnostics;
}

export interface ModelDownloadApproval {
  approved: boolean;
  approvedBy?: string;
  approvedAt?: number;
  note?: string;
}

export interface ModelDownloadProgress {
  percent: number;
  bytesDownloaded?: number;
  totalBytes?: number;
}

export interface ModelDownloadJob {
  jobId: string;
  modelId: string;
  fileName: string;
  targetFile: string;
  status: ModelDownloadJobStatus;
  progress: ModelDownloadProgress;
  bytesDownloaded?: number;
  totalBytes?: number;
  errorSummary?: string;
  approval?: ModelDownloadApproval;
  createdAt: number;
  updatedAt: number;
}

export interface ModelDownloadResult {
  success: boolean;
  job: ModelDownloadJob;
  message: string;
}

export interface ModelDownloadDiagnostics {
  offline: boolean;
  manualRequired: boolean;
  pathSafe: boolean;
  warnings: string[];
}

export interface CreateDownloadPlanInput {
  entry: ModelCatalogEntry;
  file: ModelCatalogFile;
}
