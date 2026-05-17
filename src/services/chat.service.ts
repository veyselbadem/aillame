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
  static async createMockChatResponse(input: {
    message: string;
    context?: AillameChatContext;
    project: AillameProjectContext;
  }): Promise<AillameChatResponse> {
    const { project, context, message } = input;
    const requestId = `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Load Memory Context
    const memory = MemoryService.getMemoryContext(project.projectId);

    // Select model for metadata only
    const selection = await ModelRegistryService.selectModelForCapabilities(['chat']);

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
    attachments?: any[];
    context?: AillameChatContext;
    project: AillameProjectContext;
    modelId?: string;
  }): Promise<AillameChatResponse | any> {
    const { project, context, message, modelId, attachments } = input;
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

    // 3. Nano Planning
    const { NanoPlannerService } = await import('../core/nano/nano-planner.service');
    const { NanoPlanBuilder } = await import('../core/nano/contracts/nano-plan-builder');
    const nanoDecision = await NanoPlannerService.plan(message, context);
    const nanoPlan = NanoPlanBuilder.sanitizeForClient(nanoDecision);

    // 4. Approval Gate & Step Execution
    const { NanoStepExecutorService } = await import('../core/nano/execution/nano-step-executor.service');
    const execution = await NanoStepExecutorService.executePlan(nanoPlan.plan, { 
        taskId: requestId, 
        message, 
        attachments, 
        context 
    });

    if (execution.blocked) {
      return {
        success: false,
        degraded: true,
        answer: `Bu işlem onay gerektirir: ${nanoPlan.plan.approvalReason || "Approval Required"}`,
        projectId: project.projectId,
        mode: project.mode,
        safety: {
          requiresUserApproval: true,
          canAutoApply: false,
          riskLevel: "medium",
          issues: [nanoPlan.plan.approvalReason || "Approval Required"]
        },
        meta: {
          requestId,
          nano: nanoPlan,
          nanoExecution: execution
        }
      };
    }

    // 5. Select Model
    let selection;
    if (modelId) {
       const model = await ModelRegistryService.getModelById(modelId);
       if (model) {
         selection = {
           model: { ...model, temperature: 0.7, maxOutputTokens: 1024, contextWindow: 4096 },
           reason: "Manuel seçim"
         };
       }
    }

    if (!selection) {
      selection = await ModelRegistryService.selectModelForCapabilities(['chat']);
    }

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
      const isDegraded = ["LOCAL_INFERENCE_TIMEOUT", "UNSUPPORTED_ARCHITECTURE", "DEV_MODE_NATIVE_DISABLED"].includes(runtimeResult.error?.code || "");
      
      let suggestion = "";
      if (runtimeResult.error?.code === "UNSUPPORTED_ARCHITECTURE") {
        suggestion = "Bu model mevcut runtime tarafından desteklenmiyor. Qwen 0.5B veya desteklenen başka bir GGUF model seçin.";
      }

      return {
        success: false,
        degraded: isDegraded,
        answer: suggestion || undefined,
        error: runtimeResult.error,
        projectId: project.projectId,
        mode: project.mode,
        model: {
          provider: "aillame-local",
          name: selection.model.id
        },
        meta: {
          requestId,
          taskType: context?.taskType,
          runtime: {
            used: true,
            runtime: runtimeResult.runtime,
            errorCode: runtimeResult.error?.code,
            unsupportedReason: runtimeResult.error?.code === "UNSUPPORTED_ARCHITECTURE" ? runtimeResult.error.message : undefined
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

    // 8. Passive Feedback Recording (Phase H)
    try {
        const { NanoFeedbackStoreService } = await import('../core/nano/learning/nano-feedback-store.service');
        await NanoFeedbackStoreService.recordFeedback({
            feedbackId: `fb_${requestId}`,
            taskId: '',
            planId: nanoPlan.plan.planId,
            timestamp: new Date().toISOString(),
            source: 'execution_result',
            language: 'tr', // Default for now
            userMessageSummary: message.substring(0, 500),
            intent: nanoPlan.intent,
            requiredCapabilities: nanoPlan.selectedCapabilities,
            selectedCapabilities: execution.steps.map(s => s.capability),
            selectedModels: execution.steps.filter(s => s.selectedModelId).map(s => s.selectedModelId!) ,
            executionSummary: execution.executionSummary!,
            qualitySignals: execution.success ? ['success'] : ['degraded'],
            safetyFlags: nanoPlan.plan.safetyFlags,
            safeForTraining: false,
            requiresReview: true,
            redactionStatus: 'clean',
            schemaVersion: '1.0.0'
        });
    } catch (feedbackError) {
        console.error('[ChatService] Passive feedback recording failed:', feedbackError);
    }

    // 9. Update Memory after success
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
      degraded: false,
      answer: formatted.answer,
      summary: formatted.summary,
      projectId: project.projectId,
      mode: project.mode,
      model: {
        provider: "aillame-local",
        name: selection.model.id,
        runtime: runtimeResult.runtime,
        localFirst: true
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
        latencyMs: runtimeResult.meta.durationMs,
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
          totalContextLength: builtPrompt.meta.totalContextLength
        },
        nano: nanoPlan,
        nanoExecution: execution
      }
    };
  }
}
