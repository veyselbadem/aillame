import { Router, Request, Response } from 'express';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware';
import { projectModeMiddleware } from '../../middlewares/project-mode.middleware';
import { validateChatRequest } from '../../validators/chat.validator';
import { LocalRuntimeService } from '../../services/local-runtime.service';
import { PromptBuilderService } from '../../services/prompt-builder.service';
import { ModelRegistryService } from '../../services/model-registry.service';
import { RUNTIME_CONFIG } from '../../config/runtime.config';

const router = Router();

/**
 * Get runtime status and configuration.
 */
router.get('/status', apiKeyMiddleware, async (req: Request, res: Response) => {
  const ggufAdapter = LocalRuntimeService.getRuntimeAdapter("aillame-gguf");
  const isGgufAvailable = ggufAdapter ? await ggufAdapter.checkAvailability() : false;

  res.json({
    success: true,
    runtime: {
      enableRealInference: RUNTIME_CONFIG.enableRealInference,
      allowMockFallback: RUNTIME_CONFIG.allowMockFallback,
      availableAdapters: LocalRuntimeService.getAvailableAdapters(),
      status: isGgufAvailable ? "ready" : "runtime_unavailable",
      realInferenceProvider: "node-llama-cpp",
      timeoutMs: RUNTIME_CONFIG.defaultTimeoutMs
    }
  });
});

/**
 * Test the full runtime pipeline (Prompt -> Registry -> Runtime).
 */
router.post('/test', apiKeyMiddleware, projectModeMiddleware, validateChatRequest, async (req: Request, res: Response) => {
  const project = req.aillameProject!;
  const { message, context } = req.body;

  // 1. Build Prompt
  const builtPrompt = PromptBuilderService.buildPrompt({
    message,
    context,
    project
  });

  // 2. Select Model
  const selection = ModelRegistryService.selectModelForRequest({
    mode: project.mode,
    taskType: context?.taskType
  });

  if (!selection) {
    return res.status(404).json({
      success: false,
      error: {
        code: "NO_MODEL_AVAILABLE",
        message: "İstek için uygun model bulunamadı."
      }
    });
  }

  // 3. Generate with Runtime
  const result = await LocalRuntimeService.generateWithLocalRuntime({
    modelId: selection.model.id,
    prompt: {
      messages: builtPrompt.messages,
      plainText: builtPrompt.plainText
    },
    options: {
      temperature: selection.model.temperature,
      maxOutputTokens: selection.model.maxOutputTokens,
      contextWindow: selection.model.contextWindow
    }
  });

  if (!result.success) {
    return res.status(500).json(result);
  }

  res.json(result);
});

export default router;
