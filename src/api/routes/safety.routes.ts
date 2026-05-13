import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { SafetyValidatorService } from '../../services/safety-validator.service';

const router = Router();

/**
 * Test endpoint for Safety Validator.
 */
router.post('/safety/test', apiKeyMiddleware, (req: Request, res: Response) => {
  const { projectId, mode, formattedResponse } = req.body;

  if (!formattedResponse) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_REQUEST",
        message: "formattedResponse alanı zorunludur."
      }
    });
  }

  const safetyResult = SafetyValidatorService.validateFormattedResponseSafety({
    projectId: projectId || "test-project",
    mode: mode || "code",
    formattedResponse
  });

  res.json({
    success: true,
    safety: safetyResult
  });
});

export default router;
