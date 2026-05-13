import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { ModelRegistryService } from '../../services/model-registry.service';
import { AillameMode } from '../../types/project.types';
import { ApiResponseHelper } from '../../utils/api-response';

const router = Router();

/**
 * List all models in the registry.
 */
router.get('/', apiKeyMiddleware, (req: Request, res: Response) => {
  const models = ModelRegistryService.getModelRegistryItems();
  res.json({
    success: true,
    models
  });
});

/**
 * Get details for a specific model.
 */
router.get('/:modelId', apiKeyMiddleware, (req: Request, res: Response) => {
  const { modelId } = req.params;
  const model = ModelRegistryService.getModelRegistryItemById(modelId as string);

  if (!model) {
    return res.status(404).json(
      ApiResponseHelper.error('MODEL_NOT_FOUND', 'Belirtilen model bulunamadı.')
    );
  }

  res.json({
    success: true,
    model
  });
});

/**
 * Test model selection logic.
 */
router.post('/select', apiKeyMiddleware, (req: Request, res: Response) => {
  const { mode, taskType } = req.body;

  if (!mode) {
    return res.status(400).json(
      ApiResponseHelper.error('MODE_REQUIRED', 'mode alanı zorunludur.')
    );
  }

  const validModes: AillameMode[] = ["code", "general", "image_generation"];
  if (!validModes.includes(mode as AillameMode)) {
    return res.status(400).json(
      ApiResponseHelper.error('INVALID_MODE', 'Geçersiz mode değeri.')
    );
  }

  const selection = ModelRegistryService.selectModelForRequest({ mode: mode as AillameMode, taskType });

  if (!selection) {
    return res.status(404).json(
      ApiResponseHelper.error('NO_MODEL_AVAILABLE', 'İstek için uygun model bulunamadı.')
    );
  }

  res.json({
    success: true,
    selection
  });
});

export default router;
