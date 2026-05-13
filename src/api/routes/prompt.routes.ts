import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { projectModeMiddleware } from '../../middlewares/project-mode.middleware';
import { validateChatRequest } from '../../validators/chat.validator';
import { PromptBuilderService } from '../../services/prompt-builder.service';

const router = Router();

/**
 * Test endpoint to verify the Prompt Builder.
 */
router.post(
  '/test',
  apiKeyMiddleware,
  projectModeMiddleware,
  validateChatRequest,
  (req: Request, res: Response) => {
    const project = req.aillameProject!;
    const { message, context } = req.body;

    const builtPrompt = PromptBuilderService.buildPrompt({
      message,
      context,
      project
    });

    res.json({
      success: true,
      data: builtPrompt
    });
  }
);

export default router;
