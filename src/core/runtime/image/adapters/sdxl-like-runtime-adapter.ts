import * as path from "path";
import { createNotConfiguredImageResponse, getDefaultImageRuntimeStatus } from "../image-worker";
import type { ImageRequest, ImageResponse, ImageRuntimeStatus } from "../image-runtime-types";

export type SdxlLikeRuntimeConfig = {
  runtimeId?: string;
  modelPath?: string;
  allowedModelRoot?: string;
  enabled?: boolean;
};

export type ImageDeviceCapability = {
  gpuAvailable: boolean | "unknown";
  deviceName?: string;
  vramMb?: number;
};

export type SdxlLikeAdapterValidationResult = {
  success: boolean;
  warnings: string[];
  errors: Array<{ code: string; message: string }>;
  diagnostics: {
    modelPathConfigured: boolean;
    pathWithinAllowedRoot: boolean;
    readsModelFile: false;
  };
};

function isPathWithinRoot(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export class SdxlLikeRuntimeAdapter {
  constructor(private readonly config: SdxlLikeRuntimeConfig = {}) {}

  getStatus(): ImageRuntimeStatus {
    const base = getDefaultImageRuntimeStatus();
    const validation = this.validateConfig();
    if (this.config.enabled !== true) {
      return { ...base, runtimeId: this.config.runtimeId ?? "sdxl-like-placeholder", status: "disabled", fallbackReason: "SDXL-like adapter is disabled." };
    }
    if (!validation.success) {
      return { ...base, runtimeId: this.config.runtimeId ?? "sdxl-like-placeholder", status: "not-configured", fallbackReason: validation.errors[0]?.message };
    }
    return { ...base, runtimeId: this.config.runtimeId ?? "sdxl-like-placeholder", status: "degraded", configured: true, fallbackReason: "Model execution is not enabled in this foundation phase." };
  }

  validateConfig(): SdxlLikeAdapterValidationResult {
    const warnings: string[] = [];
    const errors: SdxlLikeAdapterValidationResult["errors"] = [];
    const modelPathConfigured = typeof this.config.modelPath === "string" && this.config.modelPath.trim().length > 0;
    let pathWithinAllowedRoot = false;

    if (!modelPathConfigured) {
      errors.push({ code: "IMAGE_MODEL_PATH_NOT_CONFIGURED", message: "Image model path is not configured." });
    } else if (this.config.allowedModelRoot) {
      pathWithinAllowedRoot = isPathWithinRoot(this.config.modelPath as string, this.config.allowedModelRoot);
      if (!pathWithinAllowedRoot) errors.push({ code: "IMAGE_MODEL_PATH_OUTSIDE_ROOT", message: "Image model path is outside the allowed model root." });
    } else {
      warnings.push("allowedModelRoot is not set; model execution remains disabled.");
    }

    return {
      success: errors.length === 0,
      warnings,
      errors,
      diagnostics: { modelPathConfigured, pathWithinAllowedRoot, readsModelFile: false },
    };
  }

  getDeviceCapability(): ImageDeviceCapability {
    return { gpuAvailable: "unknown" };
  }

  prepareJob(request: ImageRequest): ImageResponse {
    return createNotConfiguredImageResponse(request);
  }

  generatePreviewResponse(request: ImageRequest): ImageResponse {
    return createNotConfiguredImageResponse(request);
  }

  runJob(request: ImageRequest): ImageResponse {
    return createNotConfiguredImageResponse(request);
  }

  cancelJob(jobId: string): { success: true; jobId: string; status: "cancelled"; diagnostics: { executionStarted: false } } {
    return { success: true, jobId, status: "cancelled", diagnostics: { executionStarted: false } };
  }
}
