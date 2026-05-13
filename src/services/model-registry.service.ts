import fs from 'fs';
import path from 'path';
import { 
  AillameLocalModelConfig, 
  AillameModelRegistryItem, 
  AillameModelStatus, 
  AillameModelSelectionInput, 
  AillameModelSelectionResult 
} from '../types/model.types';
import { LOCAL_MODEL_CONFIGS } from '../config/models.config';
import { AillameMode } from '../types/project.types';

export class ModelRegistryService {
  /**
   * Resolves a relative model path to an absolute path.
   */
  static resolveModelPath(modelPath: string): string {
    if (path.isAbsolute(modelPath)) return modelPath;
    return path.resolve(process.cwd(), modelPath);
  }

  /**
   * Checks if a model file exists on disk.
   */
  static checkModelExists(model: AillameLocalModelConfig): boolean {
    const fullPath = this.resolveModelPath(model.path);
    return fs.existsSync(fullPath);
  }

  /**
   * Gets the status of a model.
   */
  static getModelStatus(model: AillameLocalModelConfig): AillameModelStatus {
    if (!model.isActive) return "disabled";
    return this.checkModelExists(model) ? "available" : "missing";
  }

  /**
   * Returns all model configurations.
   */
  static getAllModelConfigs(): AillameLocalModelConfig[] {
    return LOCAL_MODEL_CONFIGS;
  }

  /**
   * Returns a model configuration by ID.
   */
  static getModelById(modelId: string): AillameLocalModelConfig | null {
    return LOCAL_MODEL_CONFIGS.find(m => m.id === modelId) || null;
  }

  /**
   * Returns all models as registry items (with status and existence check).
   */
  static getModelRegistryItems(): AillameModelRegistryItem[] {
    return LOCAL_MODEL_CONFIGS.map(m => this.mapToRegistryItem(m));
  }

  /**
   * Returns a registry item by ID.
   */
  static getModelRegistryItemById(modelId: string): AillameModelRegistryItem | null {
    const config = this.getModelById(modelId);
    return config ? this.mapToRegistryItem(config) : null;
  }

  /**
   * Maps a config object to a registry item.
   */
  private static mapToRegistryItem(m: AillameLocalModelConfig): AillameModelRegistryItem {
    const exists = this.checkModelExists(m);
    return {
      id: m.id,
      name: m.name,
      provider: m.provider,
      runtime: m.runtime,
      type: m.type,
      status: this.getModelStatus(m),
      path: m.path,
      exists: exists,
      defaultForModes: m.defaultForModes,
      supportedTaskTypes: m.supportedTaskTypes,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      temperature: m.temperature
    };
  }

  /**
   * Selects the best model for a request based on mode and task type.
   */
  static selectModelForRequest(input: AillameModelSelectionInput): AillameModelSelectionResult | null {
    const { mode, taskType } = input;
    const allModels = this.getModelRegistryItems();
    const activeModels = allModels.filter(m => m.status !== "disabled");

    if (activeModels.length === 0) return null;

    // 1. Exact match: Mode default + TaskType supported
    let selected = activeModels.find(m => 
      m.defaultForModes.includes(mode) && 
      (taskType ? m.supportedTaskTypes.includes(taskType) : true)
    );

    if (selected) {
      return {
        model: selected,
        reason: selected.status === "missing" 
          ? "Mode ve taskType eşleşmesine göre model seçildi (dosya eksik)." 
          : "Mode ve taskType eşleşmesine göre model seçildi."
      };
    }

    // 2. Fallback: Mode default
    selected = activeModels.find(m => m.defaultForModes.includes(mode));
    if (selected) {
      return {
        model: selected,
        reason: "Mod için varsayılan model seçildi."
      };
    }

    // 3. Global Fallback: Any active general model
    selected = activeModels.find(m => m.defaultForModes.includes("general" as AillameMode));
    if (selected) {
      return {
        model: selected,
        reason: "İstek için uygun model bulunamadı, genel amaçlı model seçildi."
      };
    }

    return null;
  }
}
