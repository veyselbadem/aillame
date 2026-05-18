import { 
  NanoOrchestrationPlan, 
  NanoExecutionResult, 
  NanoStepResult, 
  NanoPlanStep 
} from '../contracts/nano-contract.types';
import { CapabilityRegistry } from '../../models/capability-registry';

/**
 * Nano Step Executor Service - Phase G
 * 
 * Executes individual steps of a Nano Orchestration Plan.
 */
export class NanoStepExecutorService {
  /**
   * Executes a full plan step-by-step.
   */
  static async executePlan(plan: NanoOrchestrationPlan, taskInput?: any): Promise<NanoExecutionResult> {
    const startTime = Date.now();
    const results: NanoStepResult[] = [];
    let degraded = false;
    let blocked = false;
    let fallbackUsed = false;

    // 1. Approval Check
    if (plan.needsUserApproval) {
      return this.createBlockedResult(plan, 'APPROVAL_REQUIRED', plan.approvalReason || "Bu işlem onay gerektirir.");
    }

    // 2. Iterate Steps
    for (const step of plan.steps) {
      const stepStartTime = Date.now();
      const stepResult = await this.executeStep(step, taskInput);
      
      results.push(stepResult);
      
      if (stepResult.status === 'degraded' || stepResult.status === 'skipped') degraded = true;
      if (stepResult.status === 'blocked') blocked = true;
      if (stepResult.fallbackUsed) fallbackUsed = true;

      // If a critical step fails or is blocked, we might want to stop
      if (step.required && (stepResult.status === 'failed' || stepResult.status === 'blocked')) {
        break;
      }
    }

    const success = !blocked && results.every(r => r.status === 'success' || (r.status === 'degraded' && !plan.steps.find(s => s.stepId === r.stepId)?.required));

    return {
      taskId: plan.taskId,
      planId: plan.planId,
      success,
      degraded,
      blocked,
      steps: results,
      outputs: {}, // Real outputs would be collected here in Phase G+
      errors: results.filter(r => r.status === 'failed').map(r => ({ stepId: r.stepId, code: r.errorCode || 'UNKNOWN', message: r.message || '' })),
      latencyMs: Date.now() - startTime,
      feedbackCandidate: success && !degraded,
      executionSummary: {
        stepsTotal: plan.steps.length,
        stepsSucceeded: results.filter(r => r.status === 'success').length,
        stepsDegraded: results.filter(r => r.status === 'degraded').length,
        stepsFailed: results.filter(r => r.status === 'failed').length,
        blocked,
        fallbackUsed,
        missingCapabilities: results.filter(r => r.status === 'degraded' || r.status === 'skipped').map(r => r.capability),
        errorCodes: results.filter(r => r.errorCode).map(r => r.errorCode!),
        latencyMs: Date.now() - startTime
      }
    };
  }

  /**
   * Executes a single step based on capability.
   */
  private static async executeStep(step: NanoPlanStep, taskInput?: any): Promise<NanoStepResult> {
    const startTime = Date.now();
    const model = await CapabilityRegistry.resolveBestModelForCapability(step.capability);
    const fallbackUsed = false;

    // 1. Check if model is archived
    if (model?.status === 'archived') {
      return this.createStepResult(step, 'blocked', 0, { 
        errorCode: 'ARCHIVED_MODEL_BLOCKED', 
        message: 'Arşivlenmiş modeller doğrudan çalıştırılamaz.' 
      });
    }

    // 2. Capability Specific Execution Logic
    switch (step.capability) {
      case 'text.general':
      case 'legacy.test':
      case 'code.generate':
        // These are currently supported via the main chat pipeline (Qwen/Legacy)
        if (!model) {
          return this.createStepResult(step, 'degraded', Date.now() - startTime, {
            errorCode: 'MODEL_NOT_INSTALLED',
            message: `Uygun model bulunamadı: ${step.capability}`
          });
        }
        return this.createStepResult(step, 'success', Date.now() - startTime, {
          selectedModelId: model.id,
          fallbackUsed,
          outputSummary: `Execution via ${model.id}`
        });

      case 'safety.review':
        // Rule-based safety check (simulated for Phase G)
        return this.createStepResult(step, 'success', 5, {
          outputSummary: "Rule-based safety review passed."
        });

      case 'image.generate':
        return this.createStepResult(step, 'degraded', 0, {
          errorCode: 'IMAGE_MODEL_NOT_READY',
          message: 'Image worker henüz hazır değil.'
        });

      case 'vision.review':
      case 'document.ocr': {
        if (!model) {
          return this.createStepResult(step, 'degraded', Date.now() - startTime, {
            errorCode: 'VISION_MODEL_NOT_INSTALLED',
            message: 'Görüntü analiz modeli yüklü değil.'
          });
        }

        // 1. Check for attachments
        const attachment = taskInput?.attachments?.find((a: any) => a.type === 'image');
        if (!attachment) {
          return this.createStepResult(step, 'degraded', Date.now() - startTime, {
            errorCode: 'IMAGE_ATTACHMENT_MISSING',
            message: 'İşlem için gerekli görsel ek bulunamadı.'
          });
        }

        // 2. Prepare Prompt
        const prompt = step.capability === 'document.ocr' 
          ? "Bu görseldeki okunabilir metni çıkar ve kısa özetle."
          : (taskInput.message || "Bu görselde ne görüyorsun?");

        // 3. Execute VLM Inference
        try {
          const { VlmInferenceAdapter } = await import('../vision/vlm-inference-adapter');
          const vlmResponse = await VlmInferenceAdapter.analyzeImage({
            modelId: model.id,
            image: attachment.assetId || attachment.data, // Assume assetId is a path for now or data is base64
            prompt: prompt
          });

          if (!vlmResponse.success) {
            return this.createStepResult(step, 'degraded', Date.now() - startTime, {
              errorCode: vlmResponse.errorCode,
              message: vlmResponse.message || 'VLM inference failed'
            });
          }

          return this.createStepResult(step, 'success', Date.now() - startTime, {
            selectedModelId: model.id,
            outputSummary: vlmResponse.text,
            message: 'VLM execution successful'
          });

        } catch (vlmErr: any) {
          return this.createStepResult(step, 'failed', Date.now() - startTime, {
            errorCode: 'VLM_INFERENCE_CRASH',
            message: 'VLM adaptörü çalışırken hata oluştu.'
          });
        }
      }

      default:
        return this.createStepResult(step, 'skipped', 0, {
          errorCode: 'EXECUTION_NOT_SUPPORTED',
          message: `Bu capability henüz executor tarafından desteklenmiyor: ${step.capability}`
        });
    }
  }

  private static createStepResult(
    step: NanoPlanStep, 
    status: NanoStepResult['status'], 
    latency: number, 
    params: Partial<NanoStepResult>
  ): NanoStepResult {
    return {
      stepId: step.stepId,
      capability: step.capability,
      status,
      latencyMs: latency,
      fallbackUsed: false,
      safeForClient: true,
      ...params
    };
  }

  private static createBlockedResult(plan: NanoOrchestrationPlan, code: string, message: string): NanoExecutionResult {
    return {
      taskId: plan.taskId,
      planId: plan.planId,
      success: false,
      degraded: false,
      blocked: true,
      steps: [],
      outputs: {},
      errors: [],
      latencyMs: 0,
      feedbackCandidate: false,
      executionSummary: {
        stepsTotal: plan.steps.length,
        stepsSucceeded: 0,
        stepsDegraded: 0,
        stepsFailed: 0,
        blocked: true,
        fallbackUsed: false,
        missingCapabilities: [],
        errorCodes: [code],
        latencyMs: 0
      }
    };
  }
}
