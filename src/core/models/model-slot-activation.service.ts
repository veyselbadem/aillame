import fs from 'fs';
import path from 'path';
import { 
  AillameModelInstallRequest, 
  AillameModelValidationResult, 
  AillameModelHardwareRequirement 
} from './model-install.types';
import { CapabilityId } from './capability-types';
import { InstalledModelRegistryService } from '../../services/model/installed-model-registry.service';
import { isValidGguf } from '../../utils/fs-helpers';

/**
 * Model Slot Activation Service - Phase I
 * 
 * Manages validation, hardware fitting, and activation of models into capability slots.
 */
export class ModelSlotActivationService {
  // USER PC Profile
  private static readonly PC_PROFILE = {
    RAM_GB: 24,
    VRAM_GB: 8,
    GPU: 'NVIDIA RTX 5060 Laptop',
    SSD_FREE_EST: 600
  };

  /**
   * Validates a local model file and estimates hardware fit.
   */
  static async validateLocalModelFile(filePath: string): Promise<AillameModelValidationResult> {
    const result: AillameModelValidationResult = {
      exists: false,
      readable: false,
      formatValid: false,
      sizeBytes: 0,
      estimatedRamGb: 0,
      estimatedVramGb: 0,
      compatible: false,
      warnings: [],
      safeToActivate: false
    };

    if (!fs.existsSync(filePath)) return result;
    result.exists = true;

    try {
      const stats = fs.statSync(filePath);
      result.readable = true;
      result.sizeBytes = stats.size;

      // 1. Format Check
      const validHeader = await isValidGguf(filePath);
      if (!validHeader) {
        result.unsupportedReason = 'GGUF_INVALID_HEADER';
        return result;
      }
      result.formatValid = true;

      // 2. Hardware Estimate (Simple heuristic: File Size * 1.2 for overhead)
      const fileSizeGb = stats.size / (1024 * 1024 * 1024);
      result.estimatedRamGb = fileSizeGb * 1.2;
      result.estimatedVramGb = Math.min(fileSizeGb, this.PC_PROFILE.VRAM_GB);

      // 3. Hardware Fit
      const fit = this.estimateHardwareFit(fileSizeGb);
      result.compatible = fit.compatible;
      if (fit.warning) result.warnings.push(fit.warning);
      if (fit.error) result.unsupportedReason = fit.error;

      // 4. Modality & Multimodal Validation (Phase L)
      const fileName = filePath.toLowerCase();
      if (fileName.includes('vl') || fileName.includes('llava') || fileName.includes('vision') || fileName.includes('qwen3')) {
        // This looks like a VLM
        const sidecarMmproj = filePath.replace('.gguf', '.mmproj.gguf');
        const standardMmproj = path.join(path.dirname(filePath), 'mmproj.gguf');
        
        if (fs.existsSync(sidecarMmproj)) {
          result.mmprojPath = sidecarMmproj;
          result.mmprojExists = true;
        } else if (fs.existsSync(standardMmproj)) {
          result.mmprojPath = standardMmproj;
          result.mmprojExists = true;
        } else {
          result.mmprojPath = sidecarMmproj; // Fallback for error reporting
          result.mmprojExists = false;
        }
        
        result.multimodalReady = result.mmprojExists;

        if (!result.mmprojExists) {
          result.warnings.push('VISION_PROJECTOR_MISSING: Bu model görsel yetenekler için .mmproj.gguf dosyasına ihtiyaç duyar.');
          result.missingRequirements = ['mmproj'];
        }
      }

      result.safeToActivate = result.compatible && result.formatValid;
      
      // If it's a VLM, safety depends on mmproj for certain slots
      if (result.mmprojPath && !result.mmprojExists) {
        // We might allow activation for text-only, but it's risky for nano core
        result.safeToActivate = false; 
        result.unsupportedReason = 'MMPROJ_MISSING';
      }

    } catch (err) {
      result.unsupportedReason = 'FS_READ_ERROR';
    }

    return result;
  }

  /**
   * Estimates if a model fits the user's hardware.
   */
  private static estimateHardwareFit(fileSizeGb: number): { compatible: boolean; warning?: string; error?: string } {
    if (fileSizeGb > 20) {
      return { 
        compatible: false, 
        error: 'HARDWARE_INSUFFICIENT (VRAM/RAM too high for 24GB/8GB setup)',
        warning: 'Bu model 24GB RAM ve 8GB VRAM için çok büyük.' 
      };
    }
    
    if (fileSizeGb > 12) {
      return { 
        compatible: true, 
        warning: 'DİKKAT: Bu model sistem kaynaklarını zorlayabilir. Performans düşük olabilir.' 
      };
    }

    if (fileSizeGb > 6) {
      return { 
        compatible: true, 
        warning: 'Yüksek kullanım: Model GPU VRAM sınırına yakın.' 
      };
    }

    return { compatible: true };
  }

  /**
   * Checks if a model can be activated for a specific slot.
   */
  static async canActivateModelForSlot(modelId: string, slot: CapabilityId): Promise<boolean> {
    const models = await InstalledModelRegistryService.getInstalledModels();
    const model = models.find(m => m.id === modelId);
    
    if (!model) return false;
    if (model.status === 'archived') return false;
    if (model.unsupportedReason) return false;
    
    return true;
  }

  /**
   * Generates a preview of the activation.
   */
  static async createActivationPreview(modelId: string, slot: CapabilityId) {
    const models = await InstalledModelRegistryService.getInstalledModels();
    const model = models.find(m => m.id === modelId);

    return {
      modelId,
      modelName: model?.name || 'Unknown',
      slot,
      estimatedRamImpactGb: (model?.sizeBytes || 0) / (1024 * 1024 * 1024) * 1.2,
      hardwareFit: model ? this.estimateHardwareFit(model.sizeBytes / (1024 * 1024 * 1024)) : 'unknown',
      needsApproval: true,
      approvalReason: `Model ${modelId} ${slot} slotuna bağlanacak.`
    };
  }
}
