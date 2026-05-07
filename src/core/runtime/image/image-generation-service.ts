import { imageJobStore, ImageJobRecord } from "./jobs/image-job-file-store";
import { imageAssetStore } from "./assets/image-asset-file-store";
import { IGMRuntimeReadiness } from "./igm-runtime-readiness";
import { igmWorker } from "./worker/igm-worker-contract";
import { auditLogStore } from "../../security/audit-file-store";

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

  async createJob(request: TextToImageRequest): Promise<{ success: boolean; jobId?: string; warning?: string }> {
    // 1. Safety Check
    if (this.SENSITIVE_PATTERNS.some(p => p.test(request.prompt))) {
      return { success: false, warning: "Sensitive prompt detected and blocked." };
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    // 2. Readiness Check
    const readiness = IGMRuntimeReadiness.getDiagnostics();

    // 3. Create Job Record
    const job: ImageJobRecord = {
      jobId,
      projectId: request.projectId,
      sourceApp: request.sourceApp,
      mode: 'text-to-image',
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      status: readiness.finalAcceptanceReady ? 'queued' : 'not-configured',
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

    if (readiness.finalAcceptanceReady) {
      // Background execution simulation
      this.runJob(jobId, request);
    }

    return { success: true, jobId };
  }

  private async runJob(jobId: string, request: TextToImageRequest) {
    await imageJobStore.updateJob(jobId, { status: 'running', progress: 10 });
    
    try {
      const response = await igmWorker.generate({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        width: request.width || 512,
        height: request.height || 512,
        steps: 20,
        seed: -1,
        modelId: request.modelId || "",
        outputDir: imageAssetStore.getAssetsDirectory()
      });

      if (response.success && response.assetId) {
        await imageJobStore.updateJob(jobId, { 
          status: 'completed', 
          progress: 100,
          outputAssetIds: [response.assetId] 
        });
      } else {
        await imageJobStore.updateJob(jobId, { 
          status: response.status === 'not-configured' ? 'not-configured' : 'failed',
          errorSummary: response.error 
        });
      }
    } catch (err: any) {
      await imageJobStore.updateJob(jobId, { status: 'failed', errorSummary: err.message });
    }
  }
}

export const imageGenerationService = new ImageGenerationService();
