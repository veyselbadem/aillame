import { 
  CapabilityId, 
  AillameCapabilitySlot, 
  ModelSlotStatus 
} from './capability-types';
import { InstalledModelRegistryService, InstalledModel } from '../../services/model/installed-model-registry.service';

/**
 * Aillame Capability Registry - Phase D
 * 
 * Manages model slots and maps capabilities to installed models.
 */
export class CapabilityRegistry {
  private static lastVlmError: string | null = null;

  public static setVlmError(error: string) {
    this.lastVlmError = error;
  }

  private static defaultSlots: AillameCapabilitySlot[] = [
    {
      id: 'nano.multimodal.core',
      status: 'installed',
      activeModelId: 'qwen3-vl-4b-instruct-q4-k-m',
      candidates: [
        { modelId: 'qwen3-vl-4b-instruct-q4-k-m', priority: 100, role: 'primary' },
        { modelId: 'qwen2-5-vl-3b-fallback', priority: 50, role: 'fallback' }
      ],
      metadata: { 
        recommended: 'qwen3-vl-4b',
        hardwareFit: 'good',
        shared: ['vision.review', 'document.ocr', 'task.routing', 'safety.review'] 
      }
    },
    {
      id: 'text.general',
      status: 'not-installed',
      activeModelId: null,
      candidates: [
        { modelId: 'qwen3-8b-placeholder', priority: 100, role: 'primary' },
        { modelId: 'qwen2-5-7b-fallback', priority: 50, role: 'fallback' }
      ],
      metadata: {
        recommended: 'qwen3-8b',
        hardwareFit: 'good',
        alsoSupports: ['code.generate']
      }
    },
    {
      id: 'code.generate',
      status: 'not-installed',
      activeModelId: null,
      candidates: [
        { modelId: 'qwen3-coder-optional', priority: 100, role: 'specialist' },
        { modelId: 'qwen3-8b-placeholder', priority: 80, role: 'primary' }
      ],
      metadata: {
        recommended: 'qwen3-8b',
        specialist: 'qwen3-coder'
      }
    },
    {
      id: 'image.generate',
      status: 'placeholder',
      activeModelId: null,
      candidates: [
        { modelId: 'flux-1-schnell-placeholder', priority: 100, role: 'primary' },
        { modelId: 'sdxl-turbo-fallback', priority: 50, role: 'fallback' }
      ],
      metadata: {
        recommended: 'flux.1-schnell',
        hardwareFit: 'gpu-required'
      }
    },
    {
      id: 'vision.review',
      status: 'installed',
      activeModelId: 'qwen3-vl-4b-instruct-q4-k-m',
      candidates: [
        { modelId: 'qwen3-vl-4b-instruct-q4-k-m', priority: 100, role: 'primary' }
      ],
      metadata: {
        sharedWith: 'nano.multimodal.core'
      }
    },
    {
      id: 'memory.embedding',
      status: 'not-installed',
      activeModelId: null,
      candidates: [
        { modelId: 'bge-m3-placeholder', priority: 100, role: 'primary' }
      ],
      metadata: {
        recommended: 'bge-m3',
        hardwareFit: 'excellent'
      }
    },
    {
      id: 'safety.review',
      status: 'active-rules',
      activeModelId: null,
      candidates: [],
      metadata: {
        assistant: 'nano.multimodal.core'
      }
    },
    {
      id: 'document.ocr',
      status: 'installed',
      activeModelId: 'qwen3-vl-4b-instruct-q4-k-m',
      candidates: [
        { modelId: 'qwen3-vl-4b-instruct-q4-k-m', priority: 100, role: 'primary' }
      ],
      metadata: {
        sharedWith: 'nano.multimodal.core'
      }
    },
    {
      id: 'legacy.test',
      status: 'archived',
      activeModelId: null,
      candidates: [],
      metadata: { role: 'smoke-test', hardwareFit: 'excellent', note: 'Qwen 2.5 0.5B was removed.' }
    },
    {
      id: 'audio.speech',
      status: 'future',
      activeModelId: null,
      candidates: []
    },
    {
      id: 'reranker.search',
      status: 'future',
      activeModelId: null,
      candidates: []
    },
    {
      id: 'archive.research',
      status: 'archived',
      activeModelId: null,
      candidates: [],
      metadata: {
        hardwareFit: 'heavy',
        removedModelId: 'gemma-4-26b-it-q4-k-m',
        note: 'Gemma 4 26B was removed from local storage and is kept only as historical context.'
      }
    }
  ];

  /**
   * Lists all defined capability slots.
   */
  static listCapabilitySlots(): AillameCapabilitySlot[] {
    return this.defaultSlots;
  }

  /**
   * Gets a specific capability slot definition.
   */
  static getCapabilitySlot(id: CapabilityId): AillameCapabilitySlot | null {
    return this.defaultSlots.find(s => s.id === id) || null;
  }

  /**
   * Finds the best available installed model for a capability.
   */
  static async resolveBestModelForCapability(id: CapabilityId): Promise<InstalledModel | null> {
    const slot = this.getCapabilitySlot(id);
    if (!slot) return null;

    const installedModels = await InstalledModelRegistryService.getInstalledModels();
    
    // Sort candidates by priority
    const sortedCandidates = [...slot.candidates].sort((a, b) => b.priority - a.priority);

    for (const candidate of sortedCandidates) {
      const model = installedModels.find(m => m.id === candidate.modelId);
      if (model && await this.isModelSelectableForCapability(model, id)) {
        return model;
      }
    }



    return null;
  }

  /**
   * Validates if a model can be selected for a specific capability.
   */
  static async isModelSelectableForCapability(model: InstalledModel, capabilityId: CapabilityId): Promise<boolean> {
    // 1. Status Check (Must be registered to be selectable)
    if (model.status !== 'registered') return false;

    // 3. Architecture/Capability Check
    if (model.unsupportedReason) return false;

    // 4. Mode Match (Simplified)
    if (capabilityId.includes('image') && model.type !== 'image') return false;
    if (capabilityId.includes('vision') && model.type !== 'vision' && model.type !== 'text') return false; // VL models might be 'text' or 'vision'

    return true;
  }

  /**
   * Returns summary info for health endpoint.
   */
  static getRegistrySummary(): any {
    const nanoSlot = this.getCapabilitySlot('nano.multimodal.core');
    
    return {
      totalSlots: this.defaultSlots.length,
      installed: this.defaultSlots.filter(s => s.status === 'installed').length,
      placeholders: this.defaultSlots.filter(s => s.status === 'placeholder' || s.status === 'not-installed').length,
      archived: this.defaultSlots.filter(s => s.status === 'archived').length,
      vlm: {
        primary: nanoSlot?.candidates.find(c => c.role === 'primary')?.modelId || 'unknown',
        status: nanoSlot?.status || 'not-installed',
        installed: nanoSlot?.status === 'installed',
        multimodalReady: nanoSlot?.status === 'installed',
        inferenceReady: nanoSlot?.status === 'installed', // Ready if installed and multimodalReady
        activationRequired: false,
        lastError: this.lastVlmError ? this.lastVlmError.substring(0, 100) : null
      }
    };
  }
}
