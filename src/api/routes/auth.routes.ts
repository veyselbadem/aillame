import { Router } from 'express';
import { ApiResponseHelper } from '../../utils/api-response';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';

const router = Router();

/**
 * Protected test endpoint to verify API key authentication.
 */
router.get('/test', apiKeyMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Aillame API key doğrulandı.',
    auth: req.aillameAuth
  });
});

export default router;
