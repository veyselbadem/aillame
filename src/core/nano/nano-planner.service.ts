import { 
  NanoTaskInput, 
  NanoOrchestrationPlan, 
  NanoIntent, 
  NanoDecisionResult,
  NanoPlanStep
} from './contracts/nano-contract.types';
import { NanoPlanBuilder } from './contracts/nano-plan-builder';
import { CapabilityId } from '../models/capability-types';

/**
 * Nano Planner Service - Phase F
 * 
 * Bridges incoming requests with the orchestration contract and capability registry.
 */
export class NanoPlannerService {
  /**
   * Generates a plan for a given user message.
   */
  static async plan(message: string, context?: any): Promise<NanoDecisionResult> {
    const intent = this.detectIntent(message);
    const capabilities = this.resolveRequiredCapabilities(intent, message);
    
    // Create Plan Steps
    const steps: NanoPlanStep[] = capabilities.map((cap, index) => 
      NanoPlanBuilder.createStep({
        order: index,
        capability: cap,
        task: `Execute ${cap} for intent ${intent}`
      })
    );

    const plan = NanoPlanBuilder.createPlan({
      intent,
      requiredCapabilities: capabilities,
      steps,
      confidence: 0.9, // Heuristic for now
      safetyFlags: this.detectSafetyFlags(intent, message)
    });

    return await NanoPlanBuilder.buildDecision(plan);
  }

  /**
   * Detects intent based on keywords (Rule-based for Phase F).
   */
  private static detectIntent(message: string): NanoIntent {
    const msg = message.toLowerCase();

    if (this.matches(msg, ['kod', 'html', 'css', 'javascript', 'js', 'hata', 'debug', 'yazılım', 'programlama'])) {
      return 'code_generation';
    }

    if (this.matches(msg, ['uygun mu', 'ne görüyorsun', 'analiz et', 'bu görsel'])) {
      return 'image_review';
    }

    if (this.matches(msg, ['görsel üret', 'resim oluştur', 'kapak görseli', 'çizim yap'])) {
      return 'image_generation';
    }

    if (this.matches(msg, ['model indir', 'modeli değiştir', 'dosya sil', 'training başlat', 'hafızayı sil', 'ayarları değiştir'])) {
      return 'system_action';
    }
    
    if (this.matches(msg, ['makale', 'seo', 'blog', 'yazısı', 'hukuk sitem', 'psikoloji yazısı', 'içerik üret'])) {
      return 'seo_content';
    }

    return 'chat';
  }

  /**
   * Resolves capabilities needed for an intent.
   */
  private static resolveRequiredCapabilities(intent: NanoIntent, message: string): CapabilityId[] {
    switch (intent) {
      case 'chat':
        return ['text.general'];
      case 'code_generation':
        return ['code.generate', 'text.general'];
      case 'seo_content':
        return ['text.general', 'safety.review'];
      case 'image_generation':
        return ['image.generate', 'vision.review'];
      case 'image_review':
        return ['vision.review', 'text.general'];
      case 'system_action':
        return ['legacy.test'];
      default:
        return ['legacy.test'];
    }
  }

  /**
   * Detects safety flags.
   */
  private static detectSafetyFlags(intent: NanoIntent, message: string): string[] {
    const flags: string[] = [];
    const msg = message.toLowerCase();

    if (intent === 'system_action') {
      flags.push('requires_admin_approval');
    }

    if (this.matches(msg, ['indir', 'download'])) {
      flags.push('model_download_requested');
    }

    if (this.matches(msg, ['sil', 'delete', 'remove'])) {
      flags.push('file_write_requested');
    }

    if (this.matches(msg, ['hukuk', 'sağlık', 'psikoloji', 'finans'])) {
      flags.push('sensitive_domain');
    }

    if (this.matches(msg, ['gemma', 'gemma4', 'archived'])) {
      flags.push('archived_model_requested');
    }

    return flags;
  }

  /**
   * Helper for keyword matching.
   */
  private static matches(text: string, keywords: string[]): boolean {
    return keywords.some(k => text.includes(k));
  }
}
