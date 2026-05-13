import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { projectModeMiddleware } from '../../middlewares/project-mode.middleware';
import { memoryConfig } from '../../config/memory.config';
import { RUNTIME_CONFIG } from '../../config/runtime.config';
import { ModelRegistryService } from '../../services/model-registry.service';

const router = Router();

/**
 * POST /api/aillame/integration/doomsgame/test
 * Connection test endpoint for Doomsgame Engine.
 */
router.post('/doomsgame/test', apiKeyMiddleware, projectModeMiddleware, (req: Request, res: Response) => {
  const { projectId, mode } = req.body;
  const project = req.aillameProject;

  // 1. Check if model selection is possible for current mode
  const selection = ModelRegistryService.selectModelForRequest({
    mode: project?.mode || mode || 'code'
  });

  // 2. Determine readiness
  let readyForChat = true;
  
  // If we must use runtime but model is missing, not ready
  if (RUNTIME_CONFIG.chatUseRuntime && selection?.model.status === 'missing') {
    readyForChat = false;
  }

  // 3. Response
  res.json({
    success: true,
    message: "Doomsgame Engine Aillame bağlantısı başarılı.",
    integration: {
      projectId: project?.projectId || projectId,
      mode: project?.mode || mode,
      memoryEnabled: memoryConfig.enabled,
      defaultModel: selection ? {
        id: selection.model.id,
        status: selection.model.status,
        exists: selection.model.status === 'available'
      } : null,
      runtime: {
        chatUseRuntime: RUNTIME_CONFIG.chatUseRuntime,
        enableRealInference: RUNTIME_CONFIG.enableRealInference,
        allowMockFallback: RUNTIME_CONFIG.allowMockFallback
      },
      readyForChat
    }
  });
});

export default router;
