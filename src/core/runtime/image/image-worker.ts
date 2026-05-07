import type { ImageRequest, ImageResponse, ImageRuntimeStatus, ImageSafetyResult } from "./image-runtime-types";

const SECRET_PATTERNS = [/\.env(?:\.|$)/i, /\b(api[_-]?key|secret|token|password|credential)\b/i];

function now(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createImageSafetyResult(input: Pick<ImageRequest, "prompt" | "negativePrompt" | "metadata">): ImageSafetyResult {
  const serialized = `${input.prompt ?? ""}\n${input.negativePrompt ?? ""}\n${JSON.stringify(input.metadata ?? {})}`;
  const violations = SECRET_PATTERNS.some((pattern) => pattern.test(serialized))
    ? [{ code: "SENSITIVE_INPUT_BLOCKED", message: "Sensitive-looking image request content was blocked." }]
    : [];

  return {
    allowed: violations.length === 0,
    blocked: violations.length > 0,
    warnings: ["Remote URL downloads and destructive image edits are disabled in this foundation phase."],
    violations,
  };
}

export function getDefaultImageRuntimeStatus(): ImageRuntimeStatus {
  return {
    status: "not-configured",
    runtimeId: "aillame-image-foundation",
    runtimeType: "image",
    configured: false,
    fallbackReason: "No local image model/runtime is configured yet.",
    capabilities: {
      modes: ["text-to-image", "image-to-image", "inpaint", "upscale", "background-remove", "workflow"],
      supportsWorkflowJson: true,
      supportsPromptEnhancement: true,
      supportsLocalFiles: false,
      supportsRemoteFetch: false,
    },
    diagnostics: {
      comfyUiDependency: false,
      externalProcessStarted: false,
      modelExecutionEnabled: false,
    },
  };
}

export function createNotConfiguredImageResponse(request: ImageRequest): ImageResponse {
  const safety = createImageSafetyResult(request);
  const requestId = request.requestId ?? makeId("img_req");
  const jobId = makeId("img_job");

  return {
    success: false,
    requestId,
    jobId,
    status: safety.allowed ? "not-configured" : "failed",
    assets: [],
    prompt: {
      inputPrompt: request.prompt ?? "",
      negativePrompt: request.negativePrompt,
      stylePreset: request.stylePreset,
      safetyNotes: safety.warnings,
      enhancedPrompt: request.prompt?.trim() ? `${request.prompt.trim()}${request.stylePreset ? `, style: ${request.stylePreset}` : ""}` : undefined,
    },
    safety,
    error: safety.allowed
      ? {
          code: "IMAGE_RUNTIME_NOT_CONFIGURED",
          message: "Image runtime foundation is available, but no local image model is configured.",
        }
      : {
          code: "IMAGE_SAFETY_BLOCKED",
          message: "Image request was blocked by the safety guard.",
          details: { violations: safety.violations.map((item) => item.code) },
        },
    diagnostics: {
      createdAt: now(),
      runtime: getDefaultImageRuntimeStatus(),
      destructiveEditingEnabled: false,
    },
  };
}

export type AillameImageWorker = {
  getStatus(): ImageRuntimeStatus;
  submit(request: ImageRequest): ImageResponse;
};

export function createDefaultImageWorker(): AillameImageWorker {
  return {
    getStatus: getDefaultImageRuntimeStatus,
    submit: createNotConfiguredImageResponse,
  };
}
