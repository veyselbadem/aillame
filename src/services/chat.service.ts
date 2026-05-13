import { AillameChatContext, AillameChatResponse } from '../types/chat.types';
import { AillameProjectContext } from '../types/project.types';
import { ModelRegistryService } from './model-registry.service';
import { PromptBuilderService } from './prompt-builder.service';
import { LocalRuntimeService } from './local-runtime.service';
import { ResponseFormatterService } from './response-formatter.service';
import { SafetyValidatorService } from './safety-validator.service';
import { MemoryService } from './memory.service';
import { memoryConfig } from '../config/memory.config';
import crypto from 'crypto';

export class ChatService {
  /**
   * Creates a mock response (Old behavior).
   */
  static createMockChatResponse(input: {
    message: string;
    context?: AillameChatContext;
    project: AillameProjectContext;
  }): AillameChatResponse {
    const { project, context, message } = input;
    const requestId = `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Load Memory Context
    const memory = MemoryService.getMemoryContext(project.projectId);

    // Select model for metadata only
    const selection = ModelRegistryService.selectModelForRequest({
      mode: project.mode,
      taskType: context?.taskType
    });

    const modelName = selection?.model.id || "mock-aillame-local";
    const answer = "Aillame chat endpointi başarıyla çalışıyor. Bu cevap FAZ A4 mock cevabıdır. Gerçek yerel model çalıştırma sonraki fazlarda eklenecektir.";

    // Update Memory after success
    if (memoryConfig.enabled) {
      MemoryService.addRecentMessage({
        projectId: project.projectId,
        role: "user",
        content: message,
        mode: project.mode,
        taskType: context?.taskType
      });
      MemoryService.addRecentMessage({
        projectId: project.projectId,
        role: "assistant",
        content: answer,
        mode: project.mode,
        taskType: context?.taskType
      });
    }

    return {
      success: true,
      answer,
      projectId: project.projectId,
      mode: project.mode,
      model: {
        provider: "aillame-local",
        name: modelName
      },
      suggestedFiles: [],
      steps: [],
      safety: {
        requiresUserApproval: false,
        canAutoApply: false,
        riskLevel: "none",
        issues: []
      },
      meta: {
        requestId: requestId,
        taskType: context?.taskType,
        source: context?.source || project.projectId,
        mock: true,
        runtime: {
          used: false
        },
        modelSelection: selection ? {
          selected: true,
          modelId: selection.model.id,
          status: selection.model.status,
          reason: selection.reason
        } : {
          selected: false
        },
        memory: {
          enabled: memoryConfig.enabled,
          factCount: memory.meta.factCount,
          recentMessageCount: memory.meta.recentMessageCount,
          updated: memoryConfig.enabled
        }
      }
    };
  }

  /**
   * Creates a response using the Local Runtime pipeline.
   */
  static async createRuntimeChatResponse(input: {
    message: string;
    context?: AillameChatContext;
    project: AillameProjectContext;
  }): Promise<AillameChatResponse | any> {
    const { project, context, message } = input;
    const requestId = `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Load Memory Context
    const memory = MemoryService.getMemoryContext(project.projectId);

    // 2. Build Prompt
    const builtPrompt = PromptBuilderService.buildPrompt({
      message,
      context,
      project,
      memory
    });

    // 3. Select Model
    const selection = ModelRegistryService.selectModelForRequest({
      mode: project.mode,
      taskType: context?.taskType
    });

    if (!selection) {
      return {
        success: false,
        error: {
          code: "MODEL_SELECTION_FAILED",
          message: "Bu istek için uygun model seçilemedi."
        }
      };
    }

    // 4. Generate with Local Runtime
    const runtimeResult = await LocalRuntimeService.generateWithLocalRuntime({
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

    // 5. Handle Runtime Errors
    if (!runtimeResult.success) {
      return {
        ...runtimeResult,
        meta: {
          ...(runtimeResult as any).meta,
          runtime: {
            used: true
          },
          modelSelection: {
            selected: true,
            modelId: selection.model.id
          }
        }
      };
    }

    // 6. Format Response
    const formatted = ResponseFormatterService.formatRuntimeResponse({
      rawText: runtimeResult.text,
      projectId: project.projectId,
      mode: project.mode,
      taskType: context?.taskType
    });

    // 7. Validate Safety
    const safety = SafetyValidatorService.validateFormattedResponseSafety({
      projectId: project.projectId,
      mode: project.mode,
      formattedResponse: formatted
    });

    // 8. Update Memory after success
    if (memoryConfig.enabled) {
      MemoryService.addRecentMessage({
        projectId: project.projectId,
        role: "user",
        content: message,
        mode: project.mode,
        taskType: context?.taskType
      });
      MemoryService.addRecentMessage({
        projectId: project.projectId,
        role: "assistant",
        content: formatted.answer,
        mode: project.mode,
        taskType: context?.taskType
      });
    }

    // 9. Success - Format Standard Chat Response
    return {
      success: true,
      answer: formatted.answer,
      summary: formatted.summary,
      projectId: project.projectId,
      mode: project.mode,
      model: {
        provider: "aillame-local",
        name: selection.model.id
      },
      suggestedFiles: safety.allowedSuggestedFiles,
      steps: formatted.steps,
      warnings: formatted.warnings,
      safety: {
        requiresUserApproval: safety.requiresUserApproval,
        canAutoApply: false,
        riskLevel: safety.riskLevel,
        issues: safety.issues
      },
      meta: {
        requestId,
        taskType: context?.taskType,
        source: context?.source || project.projectId,
        mock: false,
        runtime: {
          used: true,
          runtime: runtimeResult.runtime,
          durationMs: runtimeResult.meta.durationMs,
          mock: runtimeResult.meta.mock
        },
        modelSelection: {
          selected: true,
          modelId: selection.model.id,
          status: selection.model.status,
          reason: selection.reason
        },
        prompt: {
          built: true,
          fileCount: builtPrompt.meta.fileCount,
          totalContextLength: builtPrompt.meta.totalContextLength,
          memoryFactCount: builtPrompt.meta.memoryFactCount,
          memoryRecentMessageCount: builtPrompt.meta.memoryRecentMessageCount
        },
        formatter: formatted.meta,
        safety: {
          validator: safety.meta.validator,
          blockedSuggestedFilesCount: safety.blockedSuggestedFiles.length,
          allowedSuggestedFilesCount: safety.allowedSuggestedFiles.length
        },
        memory: {
          enabled: memoryConfig.enabled,
          factCount: memory.meta.factCount,
          recentMessageCount: memory.meta.recentMessageCount + 2, // +2 for the new messages
          updated: memoryConfig.enabled
        }
      }
    };
  }
}
