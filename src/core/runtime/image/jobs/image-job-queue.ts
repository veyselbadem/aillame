import { createNotConfiguredImageResponse } from "../image-worker";
import type { ImageJob, ImageJobStatus, ImageOutputAsset, ImageRequest, ImageResponse } from "../image-runtime-types";

export type CreateImageJobRequest = ImageRequest;

export type ImageJobProgress = {
  jobId: string;
  status: ImageJobStatus;
  progress: number;
  updatedAt: string;
};

export type ImageJobResult = {
  success: boolean;
  job?: ImageJob;
  response?: ImageResponse;
  error?: { code: string; message: string };
};

export type ImageJobQueueState = {
  jobs: ImageJob[];
  diagnostics: ImageJobQueueDiagnostics;
};

export type ImageJobQueueDiagnostics = {
  totalJobs: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  notConfigured: number;
};

function now(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return `img_job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export class ImageJobQueue {
  private readonly jobs = new Map<string, ImageJob>();

  create(request: CreateImageJobRequest): ImageJobResult {
    try {
      const jobId = makeId();
      const timestamp = now();
      const response = createNotConfiguredImageResponse({ ...request, requestId: request.requestId });
      const job: ImageJob = {
        jobId,
        request,
        status: "not-configured",
        progress: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        result: { ...response, jobId },
        error: response.error,
      };
      this.jobs.set(jobId, job);
      return { success: true, job, response: job.result };
    } catch {
      return { success: false, error: { code: "IMAGE_JOB_CREATE_FAILED", message: "Image job could not be created." } };
    }
  }

  get(jobId: string): ImageJobResult {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: { code: "IMAGE_JOB_NOT_FOUND", message: "Image job was not found." } };
    return { success: true, job, response: job.result };
  }

  cancel(jobId: string): ImageJobResult {
    const existing = this.jobs.get(jobId);
    if (!existing) return { success: false, error: { code: "IMAGE_JOB_NOT_FOUND", message: "Image job was not found." } };
    const job: ImageJob = { ...existing, status: "cancelled", progress: clampProgress(existing.progress), updatedAt: now() };
    this.jobs.set(jobId, job);
    return { success: true, job, response: job.result };
  }

  list(): ImageJobQueueState {
    const jobs = Array.from(this.jobs.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      jobs,
      diagnostics: {
        totalJobs: jobs.length,
        queued: jobs.filter((job) => job.status === "queued").length,
        running: jobs.filter((job) => job.status === "running").length,
        completed: jobs.filter((job) => job.status === "completed").length,
        failed: jobs.filter((job) => job.status === "failed").length,
        notConfigured: jobs.filter((job) => job.status === "not-configured").length,
      },
    };
  }

  attachAssets(jobId: string, assets: ImageOutputAsset[]): ImageJobResult {
    const existing = this.jobs.get(jobId);
    if (!existing) return { success: false, error: { code: "IMAGE_JOB_NOT_FOUND", message: "Image job was not found." } };
    const response = existing.result ? { ...existing.result, assets } : undefined;
    const job: ImageJob = { ...existing, result: response, progress: clampProgress(100), status: "completed", updatedAt: now() };
    this.jobs.set(jobId, job);
    return { success: true, job, response };
  }

  clear(): void {
    this.jobs.clear();
  }
}
