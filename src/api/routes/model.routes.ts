import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { InstalledModelRegistryService } from '../../services/model/installed-model-registry.service';
import { ActiveModelStateService } from '../../services/model/active-model-state.service';
import { ApiResponseHelper } from '../../utils/api-response';

const router = Router();

/**
 * GET /api/aillame/models/installed
 * List all models registered by the user.
 */
router.get('/installed', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const models = await InstalledModelRegistryService.getInstalledModels();
    const active = await ActiveModelStateService.getActiveState();
    
    res.json({
      ok: true,
      models,
      active: {
        text: active.text?.modelId || null
      }
    });
  } catch (error: any) {
    res.status(500).json(ApiResponseHelper.error('INTERNAL_ERROR', error.message));
  }
});

/**
 * POST /api/aillame/models/installed
 * Manually register a new GGUF model path.
 */
router.post('/installed', apiKeyMiddleware, async (req: Request, res: Response) => {
  const { path, name, type } = req.body;

  if (!path) {
    return res.status(400).json(ApiResponseHelper.error('MODEL_PATH_REQUIRED', 'path alanı zorunludur.'));
  }

  try {
    const result = await InstalledModelRegistryService.registerModel({ path, name, type });
    
    if (!result.success) {
      const errorCode = result.error || 'REGISTRATION_FAILED';
      return res.status(400).json(ApiResponseHelper.error(errorCode, errorCode === 'GGUF_FILE_NOT_FOUND' ? 'Model dosyası belirtilen path’te bulunamadı.' : errorCode));
    }

    res.json({
      ok: true,
      model: result.model
    });
  } catch (error: any) {
    res.status(500).json(ApiResponseHelper.error('INTERNAL_ERROR', error.message));
  }
});

/**
 * DELETE /api/aillame/models/installed/:id
 * Remove a model from registry (does not delete file).
 */
router.delete('/installed/:id', apiKeyMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const removed = await InstalledModelRegistryService.unregisterModel(id);
    
    if (!removed) {
      return res.status(404).json(ApiResponseHelper.error('MODEL_NOT_FOUND', 'Model kaydı bulunamadı.'));
    }

    res.json({
      ok: true,
      removed: true,
      message: 'Model kaydı kaldırıldı. Dosya diskten silinmedi.'
    });
  } catch (error: any) {
    res.status(500).json(ApiResponseHelper.error('INTERNAL_ERROR', error.message));
  }
});

/**
 * POST /api/aillame/models/select
 * Select an active text model.
 */
router.post('/select', apiKeyMiddleware, async (req: Request, res: Response) => {
  const { modelId, type } = req.body;

  if (!modelId) {
    return res.status(400).json(ApiResponseHelper.error('MODEL_ID_REQUIRED', 'modelId alanı zorunludur.'));
  }

  if (type && type !== 'text') {
    return res.status(400).json(ApiResponseHelper.error('NOT_IMPLEMENTED_IN_PHASE_2', 'Şu an sadece text tipi model seçimi desteklenmektedir.'));
  }

  try {
    const result = await ActiveModelStateService.selectModel(modelId, 'text');
    
    if (!result.success) {
      const errorCode = result.error || 'SELECTION_FAILED';
      return res.status(400).json(ApiResponseHelper.error(errorCode, errorCode));
    }

    res.json({
      ok: true,
      active: result.state
    });
  } catch (error: any) {
    res.status(500).json(ApiResponseHelper.error('INTERNAL_ERROR', error.message));
  }
});

/**
 * GET /api/aillame/models/active
 * Get current active model state.
 */
router.get('/active', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const state = await ActiveModelStateService.getActiveState();
    res.json({
      ok: true,
      active: state
    });
  } catch (error: any) {
    res.status(500).json(ApiResponseHelper.error('INTERNAL_ERROR', error.message));
  }
});

/**
 * POST /api/aillame/models/validate-active
 * Manually trigger active model validation.
 */
router.post('/validate-active', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = await ActiveModelStateService.validateActiveModel();
    res.json({
      ok: true,
      ...validation
    });
  } catch (error: any) {
    res.status(500).json(ApiResponseHelper.error('INTERNAL_ERROR', error.message));
  }
});

export default router;
