import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { projectModeMiddleware } from '../../middlewares/project-mode.middleware';
import { validateChatRequest } from '../../validators/chat.validator';
import { ChatService } from '../../services/chat.service';
import { RUNTIME_CONFIG } from '../../config/runtime.config';

const router = Router();

/**
 * Main chat endpoint for Aillame.
 */
router.post(
  '/chat',
  apiKeyMiddleware,
  projectModeMiddleware,
  validateChatRequest,
  async (req: Request, res: Response) => {
    // Project and Auth context are guaranteed here
    const project = req.aillameProject!;
    const { message, context } = req.body;

    let response;
    if (RUNTIME_CONFIG.chatUseRuntime) {
      response = await ChatService.createRuntimeChatResponse({
        message,
        context,
        project
      });
    } else {
      response = ChatService.createMockChatResponse({
        message,
        context,
        project
      });
    }

    if (response.success === false) {
      const statusCode = response.error?.code === 'INTERNAL_SERVER_ERROR' ? 500 : 400;
      return res.status(statusCode).json(response);
    }

    res.json(response);
  }
);

export default router;
