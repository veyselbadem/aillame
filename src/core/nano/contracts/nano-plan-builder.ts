import { 
  NanoTaskInput, 
  NanoOrchestrationPlan, 
  NanoPlanStep, 
  NanoIntent,
  NanoDecisionResult,
  NanoTaskSource,
  NanoTaskLanguage
} from './nano-contract.types';
import { CapabilityId } from '../../models/capability-types';
import { CapabilityRegistry } from '../../models/capability-registry';

/**
 * Nano Plan Builder - Phase E
 * 
 * Orchestrates task analysis and plan generation based on capabilities.
 */
export class NanoPlanBuilder {
  /**
   * Creates a standardized task input object.
   */
  static createInput(params: Partial<NanoTaskInput>): NanoTaskInput {
    return {
      taskId: params.taskId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      source: params.source || 'user_chat',
      language: params.language || 'tr',
      message: params.message || '',
      attachments: params.attachments || [],
      context: params.context || { availableCapabilities: [] },
      createdAt: new Date().toISOString(),
      ...params
    };
  }

  /**
   * Creates a standardized orchestration plan.
   */
  static createPlan(params: Partial<NanoOrchestrationPlan>): NanoOrchestrationPlan {
    const plan: NanoOrchestrationPlan = {
      planId: params.planId || `plan_${Date.now()}`,
      taskId: params.taskId || '',
      intent: params.intent || 'unknown',
      requiredCapabilities: params.requiredCapabilities || [],
      steps: params.steps || [],
      confidence: params.confidence || 0.0,
      needsUserApproval: params.needsUserApproval || false,
      fallbackStrategy: params.fallbackStrategy || 'degrade',
      safetyFlags: params.safetyFlags || [],
      createdAt: new Date().toISOString(),
      ...params
    };

    // Auto-detect needsUserApproval based on safety rules
    if (this.shouldRequireApproval(plan)) {
      plan.needsUserApproval = true;
      plan.approvalReason = plan.approvalReason || "Bu işlem sistem değişikliği veya hassas veri erişimi gerektiriyor.";
    }

    return plan;
  }

  /**
   * Generates a plan step.
   */
  static createStep(params: Partial<NanoPlanStep>): NanoPlanStep {
    return {
      stepId: params.stepId || `step_${Math.random().toString(36).substring(2, 5)}`,
      order: params.order || 0,
      capability: params.capability || 'legacy.test',
      task: params.task || '',
      required: params.required ?? true,
      canFallback: params.canFallback ?? true,
      timeoutMs: params.timeoutMs || 10000,
      ...params
    };
  }

  /**
   * Analyzes if a plan requires user approval.
   */
  private static shouldRequireApproval(plan: NanoOrchestrationPlan): boolean {
    const sensitiveIntents: NanoIntent[] = ['system_action'];
    if (sensitiveIntents.includes(plan.intent)) return true;

    const sensitiveFlags = [
      'requires_admin_approval',
      'file_write_requested',
      'training_requested',
      'model_download_requested',
      'archived_model_requested'
    ];
    if (plan.safetyFlags.some(f => sensitiveFlags.includes(f))) return true;

    return false;
  }

  /**
   * Builds a final decision result for the client.
   */
  static async buildDecision(plan: NanoOrchestrationPlan): Promise<NanoDecisionResult> {
    const selectedModels: string[] = [];
    let degraded = false;
    const warnings: string[] = [];
    const capabilityMisses: CapabilityId[] = [];

    for (const capId of plan.requiredCapabilities) {
      const model = await CapabilityRegistry.resolveBestModelForCapability(capId);
      if (model) {
        selectedModels.push(model.id);
      } else {
        degraded = true;
        capabilityMisses.push(capId);
        warnings.push(`Kapasite eksikliği: ${capId} için uygun model bulunamadı.`);
      }
    }

    return {
      success: true,
      degraded,
      intent: plan.intent,
      plan,
      selectedCapabilities: plan.requiredCapabilities,
      selectedModels,
      confidence: plan.confidence,
      warnings,
      _internalDebug: {
        capabilityMisses
      }
    };
  }

  /**
   * Sanitizes the decision for external consumption (removes internal debug).
   */
  static sanitizeForClient(decision: NanoDecisionResult): Omit<NanoDecisionResult, '_internalDebug'> {
    const { _internalDebug, ...sanitized } = decision;
    return sanitized;
  }
}
