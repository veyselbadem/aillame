import fs from "fs";
import path from "path";
import { appendJsonl, getStorageRoot, readJsonl, writeJsonl } from "../../storage/file-store";
import type { ModelCatalogEntry, ModelCatalogFile } from "../catalog/model-catalog-types";
import { CURATED_GGUF_STARTER_CATALOG } from "../catalog/curated-gguf-catalog";
import type { ModelDownloadJob, ModelDownloadPlan, ModelDownloadResult } from "./model-download-types";

const JOBS_FILE = "model-download-jobs.jsonl";

function getModelLibraryDir(): string {
  const configured = process.env.AILLAME_MODEL_LIBRARY_DIR;
  if (configured && configured.trim()) return path.resolve(process.cwd(), configured);
  return path.join(getStorageRoot(), "models", "gguf");
}

function safeFileName(fileName: string): string {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function safeTargetPath(targetDirectory: string, fileName: string): { pathSafe: boolean; targetFile: string } {
  const resolvedDir = path.resolve(targetDirectory);
  const targetFile = path.join(resolvedDir, safeFileName(fileName));
  const relative = path.relative(resolvedDir, targetFile);
  return {
    pathSafe: Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative),
    targetFile,
  };
}

function findCatalogFile(modelId: string, fileName: string): { entry?: ModelCatalogEntry; file?: ModelCatalogFile } {
  const entry = CURATED_GGUF_STARTER_CATALOG.find((candidate) => candidate.modelId === modelId);
  const file = entry?.files.find((candidate) => candidate.fileName === fileName);
  return { entry, file };
}

export class ModelDownloadService {
  createDownloadPlan(entry: ModelCatalogEntry, file: ModelCatalogFile): ModelDownloadPlan {
    const targetDirectory = getModelLibraryDir();
    const target = safeTargetPath(targetDirectory, file.fileName);
    const risks: ModelDownloadPlan["risks"] = [];
    const nextActions: string[] = [];
    const warnings: string[] = [];

    if (entry.license) risks.push("license");
    if (!file.downloadUrl) risks.push("manual-source");
    if (!target.pathSafe) risks.push("path");
    if (entry.compatibility.score < 0.7) risks.push("compatibility");

    if (!file.downloadUrl) {
      nextActions.push("Provide a verified local GGUF file or add a reviewed download URL before starting download.");
    } else {
      nextActions.push("Review license, size and compatibility, then approve the download job.");
    }
    nextActions.push("After the file exists locally, verify it and select it as active GGUF model candidate.");

    try {
      if (!fs.existsSync(targetDirectory)) fs.mkdirSync(targetDirectory, { recursive: true });
    } catch {
      warnings.push("Target directory could not be created during plan preview.");
    }

    return {
      modelId: entry.modelId,
      fileName: file.fileName,
      sourceProvider: entry.provider,
      downloadUrl: file.downloadUrl,
      targetDirectory,
      targetFile: target.targetFile,
      estimatedSizeBytes: file.sizeBytes,
      license: entry.license,
      compatibility: entry.compatibility,
      diskSpaceStatus: "unknown",
      approvalRequired: true,
      canAutoStart: false,
      risks,
      nextActions,
      diagnostics: {
        offline: process.env.AILLAME_MODEL_DOWNLOADS_ENABLED !== "true",
        manualRequired: !file.downloadUrl,
        pathSafe: target.pathSafe,
        warnings,
      },
    };
  }

  createDownloadJob(plan: ModelDownloadPlan): ModelDownloadJob {
    const now = Date.now();
    const job: ModelDownloadJob = {
      jobId: `model-dl-${now}-${Math.random().toString(36).slice(2, 8)}`,
      modelId: plan.modelId,
      fileName: plan.fileName,
      targetFile: plan.targetFile,
      status: plan.downloadUrl ? "waiting-approval" : "manual-required",
      progress: { percent: 0, totalBytes: plan.estimatedSizeBytes },
      totalBytes: plan.estimatedSizeBytes,
      createdAt: now,
      updatedAt: now,
    };
    appendJsonl(JOBS_FILE, job);
    return job;
  }

  listDownloadJobs(): ModelDownloadJob[] {
    return readJsonl<ModelDownloadJob>(JOBS_FILE).lines;
  }

  getDownloadJob(jobId: string): ModelDownloadJob | undefined {
    return this.listDownloadJobs().find((job) => job.jobId === jobId);
  }

  updateJob(job: ModelDownloadJob): ModelDownloadJob {
    const jobs = this.listDownloadJobs();
    const next = jobs.map((candidate) => candidate.jobId === job.jobId ? { ...job, updatedAt: Date.now() } : candidate);
    writeJsonl(JOBS_FILE, next);
    return next.find((candidate) => candidate.jobId === job.jobId) ?? job;
  }

  approveDownloadJob(jobId: string, approvedBy = "admin"): ModelDownloadResult {
    const job = this.getDownloadJob(jobId);
    if (!job) {
      throw new Error("Download job not found.");
    }
    if (job.status !== "waiting-approval") {
      return { success: false, job, message: "Only waiting-approval jobs can be approved." };
    }
    return {
      success: true,
      job: this.updateJob({
        ...job,
        status: "approved",
        approval: { approved: true, approvedBy, approvedAt: Date.now() },
      }),
      message: "Download job approved. It will not auto-start.",
    };
  }

  startDownloadJob(jobId: string): ModelDownloadResult {
    const job = this.getDownloadJob(jobId);
    if (!job) throw new Error("Download job not found.");
    if (job.status !== "approved") {
      return { success: false, job, message: "Download requires explicit approval before start." };
    }
    if (process.env.AILLAME_MODEL_DOWNLOADS_ENABLED !== "true") {
      return {
        success: false,
        job: this.updateJob({ ...job, status: "manual-required", errorSummary: "Model downloads are disabled/offline." }),
        message: "Model downloads are disabled. Provide the GGUF file manually.",
      };
    }
    return {
      success: false,
      job: this.updateJob({ ...job, status: "manual-required", errorSummary: "Network download implementation is intentionally disabled in this foundation." }),
      message: "Download flow is plan/approval only in this phase.",
    };
  }

  cancelDownloadJob(jobId: string): ModelDownloadResult {
    const job = this.getDownloadJob(jobId);
    if (!job) throw new Error("Download job not found.");
    return {
      success: true,
      job: this.updateJob({ ...job, status: "cancelled" }),
      message: "Download job cancelled.",
    };
  }

  createPlanFromCatalog(modelId: string, fileName: string): ModelDownloadPlan {
    const { entry, file } = findCatalogFile(modelId, fileName);
    if (!entry || !file) throw new Error("Catalog model/file not found.");
    return this.createDownloadPlan(entry, file);
  }
}

export const modelDownloadService = new ModelDownloadService();
