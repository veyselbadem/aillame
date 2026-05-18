import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { imageGenerationService } from '../../core/runtime/image/image-generation-service';
import { imageJobStore } from '../../core/runtime/image/jobs/image-job-file-store';
import { imageAssetStore } from '../../core/runtime/image/assets/image-asset-file-store';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * POST /api/aillame/image/generate
 * Start a new image generation job.
 */
router.post('/generate', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const { prompt, negativePrompt, width, height, modelId } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required." });
    }

    const result = await imageGenerationService.createJob({
      projectId: 'default',
      sourceApp: 'aillame-api',
      prompt,
      negativePrompt,
      width: width || 512,
      height: height || 512,
      modelId
    });

    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.warning || "Failed to create image job.",
        errorCode: "IMAGE_GENERATION_FAILED"
      });
    }

    res.json({
      success: true,
      jobId: result.jobId
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      errorCode: "INTERNAL_SERVER_ERROR"
    });
  }
});

/**
 * GET /api/aillame/image/status/:jobId
 * Check the status of a specific job.
 */
router.get('/status/:jobId', apiKeyMiddleware, async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const jobs = await imageJobStore.listJobs();
  const job = jobs.find(j => j.jobId === jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found." });
  }

  res.json({
    success: true,
    job: {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      outputAssetIds: job.outputAssetIds,
      errorSummary: job.errorSummary,
      device: job.device
    }
  });
});

/**
 * GET /api/aillame/image/view/:assetId
 * View/Download a generated image.
 */
router.get('/view/:assetId', apiKeyMiddleware, async (req: Request, res: Response) => {
  const assetId = req.params.assetId as string;
  const asset = await imageAssetStore.getAsset(assetId);

  if (!asset) {
    return res.status(404).json({ success: false, error: "Asset not found." });
  }

  const assetsDir = imageAssetStore.getAssetsDirectory();
  const filePath = path.join(assetsDir, asset.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "Physical file not found." });
  }

  res.setHeader('Content-Type', asset.mimeType || 'image/png');
  fs.createReadStream(filePath).pipe(res);
});

export default router;
