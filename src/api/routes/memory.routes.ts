import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { MemoryService } from '../../services/memory.service';
import { MemoryStorageService } from '../../services/memory-storage.service';

const router = Router();

/**
 * Validates if the project ID in the request matches the authorized project.
 */
const validateProjectAuth = (req: Request, res: Response, next: any) => {
  const projectId = req.params.projectId as string;
  const auth = req.aillameAuth;

  if (auth && auth.projectId !== projectId) {
    return res.status(403).json({
      success: false,
      error: {
        code: "PROJECT_KEY_MISMATCH",
        message: "API key bu proje için yetkili değil."
      }
    });
  }
  next();
};

/**
 * GET /api/aillame/memory/:projectId
 * Returns the full project memory.
 */
router.get('/memory/:projectId', apiKeyMiddleware, validateProjectAuth, (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const memory = MemoryStorageService.loadProjectMemory(projectId);

  if (!memory) {
    return res.status(404).json({
      success: false,
      error: {
        code: "PROJECT_MEMORY_NOT_FOUND",
        message: "Belirtilen proje için hafıza kaydı bulunamadı."
      }
    });
  }

  res.json({
    success: true,
    memory
  });
});

/**
 * GET /api/aillame/memory/:projectId/context
 * Returns the memory context used for prompts.
 */
router.get('/memory/:projectId/context', apiKeyMiddleware, validateProjectAuth, (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const context = MemoryService.getMemoryContext(projectId);

  res.json({
    success: true,
    memory: context
  });
});

/**
 * POST /api/aillame/memory/:projectId/facts
 * Adds a new fact to the project memory.
 */
router.post('/memory/:projectId/facts', apiKeyMiddleware, validateProjectAuth, (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const { text, tags } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Fact metni (text) zorunludur."
      }
    });
  }

  const memory = MemoryService.addMemoryFact(projectId, text, tags);

  res.json({
    success: true,
    memory
  });
});

/**
 * POST /api/aillame/memory/:projectId/recent/clear
 * Clears recent messages for the project.
 */
router.post('/memory/:projectId/recent/clear', apiKeyMiddleware, validateProjectAuth, (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const memory = MemoryService.clearRecentMessages(projectId);

  res.json({
    success: true,
    memory
  });
});

export default router;
