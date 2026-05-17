import { InstalledModelRegistryService, InstalledModel } from './model/installed-model-registry.service';
import fs from 'fs';

export class ModelRegistryService {
  /**
   * Resolves a relative model path to an absolute path.
   */
  static resolveModelPath(modelPath: string): string {
    return modelPath; // Already absolute in new system
  }

  /**
   * Checks if a model file exists on disk.
   */
  static checkModelExists(model: { path: string }): boolean {
    return fs.existsSync(model.path);
  }

  /**
   * Selects a model based on required capabilities.
   */
  static async selectModelForCapabilities(capabilities: string[]): Promise<any> {
    const { CapabilityRegistry } = await import('../core/models/capability-registry');
    
    // Mapping legacy capability strings to new CapabilityId
    let targetCapability: any = 'legacy.test';
    if (capabilities.includes('chat') || capabilities.includes('general')) {
      targetCapability = 'text.general';
    } else if (capabilities.includes('code')) {
      targetCapability = 'code.generate';
    } else if (capabilities.includes('image')) {
      targetCapability = 'image.generate';
    }

    const recommendedModel = await CapabilityRegistry.resolveBestModelForCapability(targetCapability);
    
    if (recommendedModel) {
      return {
        model: {
          ...recommendedModel,
          temperature: 0.7,
          maxOutputTokens: 1024,
          contextWindow: 4096
        },
        reason: `Capability Registry: ${targetCapability}`
      };
    }

    // Legacy Fallback
    const models = await InstalledModelRegistryService.getInstalledModels();
    const fallbackModel = models.find(m => 
      m.status === 'registered' && 
      !m.isExperimental && 
      !m.unsupportedReason
    );

    const model = fallbackModel || models[0];
    
    if (!model) return null;

    return {
      model: {
        ...model,
        temperature: 0.7,
        maxOutputTokens: 1024,
        contextWindow: 4096
      },
      reason: "Otomatik seçim (Legacy Fallback)"
    };
  }

  /**
   * Selects a model for a specific request (Legacy bridge).
   */
  static selectModelForRequest(req: { mode: string }): any {
    // Synchronous version for simple routes, might need async refactor later
    // For now returning a placeholder that matches the expected structure
    return {
      model: {
        id: "default-model",
        status: "available" as const
      },
      reason: "Phase 3 Registry Placeholder"
    };
  }

  /**
   * Returns a model configuration by ID.
   */
  static async getModelById(modelId: string): Promise<InstalledModel | null> {
    const models = await InstalledModelRegistryService.getInstalledModels();
    return models.find(m => m.id === modelId) || null;
  }
}
