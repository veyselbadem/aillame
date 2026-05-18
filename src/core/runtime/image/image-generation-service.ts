import fs from 'fs';
import path from 'path';
import { imageJobStore, ImageJobRecord } from "./jobs/image-job-file-store";
import { imageAssetStore } from "./assets/image-asset-file-store";
import { IGMRuntimeReadiness } from "./igm-runtime-readiness";
import { igmWorker } from "./worker/igm-worker-contract";
import { auditLogStore } from "../../security/audit-file-store";
import { acquireGpuHeavyLock, releaseGpuHeavyLock } from "../gpu-heavy-lock";

export interface TextToImageRequest {
  projectId: string;
  sourceApp?: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  modelId?: string;
}

export class ImageGenerationService {
  private SENSITIVE_PATTERNS = [/\b(api[_-]?key|secret|token|password|credential)\b/i];
  private executionQueue: Promise<void> = Promise.resolve();

  async createJob(request: TextToImageRequest): Promise<{ success: boolean; jobId?: string; warning?: string }> {
    // 1. Safety Check
    if (this.SENSITIVE_PATTERNS.some(p => p.test(request.prompt))) {
      return { success: false, warning: "Sensitive prompt detected and blocked." };
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const readiness = IGMRuntimeReadiness.getDiagnostics();
    if (!readiness.configured) {
      return { success: false, warning: `IGM Runtime is not configured: ${readiness.reason}` };
    }

    // 3. Create Job Record
    const job: ImageJobRecord = {
      jobId,
      projectId: request.projectId,
      sourceApp: request.sourceApp,
      mode: 'text-to-image',
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      status: 'queued',
      progress: 0,
      modelId: request.modelId || process.env.AILLAME_IGM_ACTIVE_MODEL,
      outputAssetIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await imageJobStore.addJob(job);

    // 4. Audit
    auditLogStore.log({
      action: 'image.job.create',
      status: job.status,
      metadata: { jobId, projectId: request.projectId }
    });

    // Background execution is serialized because local IGM workers load large models
    // and concurrent process launches can exhaust memory on desktop setups.
    this.executionQueue = this.executionQueue
      .catch(() => undefined)
      .then(() => this.runJob(jobId, request).catch(e => {
        console.error("IGM runJob critical failure:", e);
      }));

    return { success: true, jobId };

  }

  private async runJob(jobId: string, request: TextToImageRequest) {
    const lockResult = acquireGpuHeavyLock('sdxl-turbo', {
      reason: 'SDXL Turbo image generation job',
      metadata: { jobId, projectId: request.projectId, endpoint: '/api/image-generation' },
    });

    if (!lockResult.acquired || !lockResult.lock) {
      await imageJobStore.updateJob(jobId, {
        status: 'failed',
        errorSummary: lockResult.message,
      });
      return;
    }

    try {
      await imageJobStore.updateJob(jobId, { status: 'running', progress: 10 });
      
      const diagnostics = IGMRuntimeReadiness.getDiagnostics();
      const modelDir = process.env.AILLAME_IGM_MODEL_DIR;
      const visionModelPath = process.env.AILLAME_VISION_MODEL_PATH;
      let resolvedModelId = request.modelId || process.env.AILLAME_IGM_ACTIVE_MODEL || "";
      let activeModelPath = "";

      if (visionModelPath && (request.modelId === "sd-xl-turbo" || !request.modelId)) {
        activeModelPath = visionModelPath;
        resolvedModelId = "sd-xl-turbo";
      } else if (modelDir && resolvedModelId) {
        activeModelPath = path.isAbsolute(resolvedModelId)
            ? resolvedModelId
            : path.join(modelDir, resolvedModelId);
      }
      
      // Validate model path safety
      if (activeModelPath && !diagnostics.activeModelExists) {
        await imageJobStore.updateJob(jobId, { status: 'failed', errorSummary: `Görsel üretim modeli bulunamadı: ${diagnostics.reason}` });
        return;
      }

      const outputDir = process.env.AILLAME_IGM_OUTPUT_DIR || ".aillame-data/assets/images";

      const response = await igmWorker.generate({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        width: request.width || 512,
        height: request.height || 512,
        steps: 20,
        seed: -1,
        modelId: resolvedModelId,
        outputDir: imageAssetStore.getAssetsDirectory()
      });

      const allowCpuFallback = process.env.AILLAME_IGM_ALLOW_CPU_FALLBACK === 'true';
      const isHardwareError = response.error?.toLowerCase().includes('cuda') || response.error?.toLowerCase().includes('gpu');
      
      if (!response.success && isHardwareError && allowCpuFallback && response.device !== 'cpu') {
        console.warn(`[IGM Service] CUDA error detected for job ${jobId}. Retrying with CPU fallback...`);
        await imageJobStore.updateJob(jobId, { status: 'running', progress: 15, deviceReason: 'Retrying with CPU due to CUDA failure.' });
        
        const fallbackResponse = await igmWorker.generate({
          ...request,
          width: request.width || 512,
          height: request.height || 512,
          steps: 20,
          seed: -1,
          modelId: resolvedModelId,
          outputDir: imageAssetStore.getAssetsDirectory(),
          device: 'cpu'
        } as any);

        // Process fallback response
        await this.finalizeJob(jobId, request, fallbackResponse);
        return;
      }

      await this.finalizeJob(jobId, request, response);
    } catch (err: any) {
      console.error(`[IGM Worker Error] Job ${jobId} failed:`, err);
      await imageJobStore.updateJob(jobId, { status: 'failed', errorSummary: err.message });
    } finally {
      releaseGpuHeavyLock(lockResult.lock.id);
    }
  }

  private async finalizeJob(jobId: string, request: TextToImageRequest, response: any) {
    let assetId = response.assetId;
    if (response.success && response.imagePath && !assetId) {
      // Register the new file as an asset
      const asset = await imageAssetStore.registerLocalFile({
        jobId,
        projectId: request.projectId,
        filePath: response.imagePath,
        mimeType: response.mimeType || 'image/png',
        modelId: response.modelId || request.modelId || '',
        promptPreview: request.prompt.slice(0, 100)
      });
      assetId = asset.assetId;
    }

    if (response.success && assetId) {
      await imageJobStore.updateJob(jobId, { 
        status: 'completed', 
        progress: 100,
        outputAssetIds: [assetId],
        device: response.device,
        deviceDetails: response.deviceDetails,
        deviceReason: response.deviceReason
      });
    } else {
      await imageJobStore.updateJob(jobId, { 
        status: response.status === 'not-configured' ? 'not-configured' : 'failed',
        errorSummary: response.error || 'Worker returned success but no asset produced. Missing imagePath?'
      });
    }
  }
}

export const imageGenerationService = new ImageGenerationService();
