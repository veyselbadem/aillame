export type ImageGenerationMode =
  | "text-to-image"
  | "image-to-image"
  | "inpaint"
  | "upscale"
  | "background-remove"
  | "workflow"
  | "unknown";

export type ImageJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "degraded"
  | "not-configured";

export type ImageRuntimeStatusKind = "ready" | "disabled" | "degraded" | "not-configured";

export type ImageWorkerCapabilities = {
  modes: ImageGenerationMode[];
  supportsWorkflowJson: boolean;
  supportsPromptEnhancement: boolean;
  supportsLocalFiles: boolean;
  supportsRemoteFetch: false;
};

export type ImageRuntimeStatus = {
  status: ImageRuntimeStatusKind;
  runtimeId: string;
  runtimeType: "image";
  configured: boolean;
  selectedModelId?: string;
  fallbackReason?: string;
  capabilities: ImageWorkerCapabilities;
  diagnostics: Record<string, unknown>;
};

export type ImageSafetyResult = {
  allowed: boolean;
  blocked: boolean;
  warnings: string[];
  violations: Array<{ code: string; message: string }>;
};

export type ImagePromptEnhancement = {
  inputPrompt: string;
  negativePrompt?: string;
  stylePreset?: string;
  safetyNotes: string[];
  enhancedPrompt?: string;
};

export type ImageOutputAsset = {
  assetId: string;
  jobId: string;
  fileName?: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "application/json";
  width?: number;
  height?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ImageRequest = {
  requestId?: string;
  projectId?: string;
  mode: ImageGenerationMode;
  prompt?: string;
  negativePrompt?: string;
  stylePreset?: string;
  workflowId?: string;
  sourceImageAssetId?: string;
  width?: number;
  height?: number;
  seed?: number;
  metadata?: Record<string, unknown>;
};

export type ImageResponse = {
  success: boolean;
  requestId: string;
  jobId?: string;
  status: ImageJobStatus;
  assets: ImageOutputAsset[];
  prompt?: ImagePromptEnhancement;
  safety: ImageSafetyResult;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  diagnostics: Record<string, unknown>;
};

export type ImageJob = {
  jobId: string;
  request: ImageRequest;
  status: ImageJobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  result?: ImageResponse;
  error?: ImageResponse["error"];
};
