export type ImageAssetStatus = 'created' | 'available' | 'missing' | 'deleted' | 'failed';
export type ImageAssetSource = 'manual' | 'job' | 'import' | 'unknown';

export interface ImageAssetRecord {
  assetId: string;
  jobId?: string;
  projectId: string;
  sourceApp?: string;
  prompt: string;
  negativePrompt?: string;
  fileName: string;
  relativePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  status: ImageAssetStatus;
  modelId?: string;
  runtimeId?: string;
  workflowId?: string;
  metadata: Record<string, any>;
  createdAt: number;
  deletedAt?: number;
}

export interface ImageAssetQuery {
  projectId?: string;
  jobId?: string;
  status?: ImageAssetStatus;
  limit?: number;
}

export interface ImageAssetDiagnostics {
  totalAssets: number;
  availableCount: number;
  missingCount: number;
  totalSizeBytes: number;
}
