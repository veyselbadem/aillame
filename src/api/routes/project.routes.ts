import { Router } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { projectModeMiddleware } from '../../middlewares/project-mode.middleware';

const router = Router();

/**
 * Protected test endpoint to verify project and mode validation.
 */
router.post('/test', apiKeyMiddleware, projectModeMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Aillame project/mode doğrulandı.',
    auth: req.aillameAuth,
    project: req.aillameProject
  });
});

export default router;
