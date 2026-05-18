import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { 
  readJsonSafe, 
  writeJsonAtomic, 
  REGISTRY_DIR, 
  isValidGguf,
  normalizePath 
} from '../../utils/fs-helpers';

export type ModelModality = 'text' | 'vision_language' | 'image_generation' | 'embedding' | 'audio' | 'unknown';

export interface InstalledModel {
  id: string;
  name: string;
  type: 'text' | 'image' | 'code' | 'vision';
  modality: ModelModality;
  path: string;
  format: 'gguf';
  status: 'registered' | 'missing' | 'invalid' | 'archived' | 'removed';
  runtime?: string;
  sizeBytes: number;
  addedAt: string;
  lastValidatedAt: string;
  validation: {
    valid: boolean;
    reason: string | null;
  };
  mmprojPath?: string;
  multimodalReady?: boolean;
  visionConfig?: {
    requiresMmproj: boolean;
    supportedImageInput: boolean;
    maxImageSize?: string;
  };
  architecture?: string;
  isExperimental?: boolean;
  unsupportedReason?: string;
  autoLoad?: boolean;
  capabilities?: string[];
  slot?: string;
  tags?: string[];
}

const REGISTRY_FILE = path.join(REGISTRY_DIR, 'installed-models.json');

export class InstalledModelRegistryService {
  /**
   * Lists all models registered by the user.
   */
  static async getInstalledModels(): Promise<InstalledModel[]> {
    const registry = await readJsonSafe<{ models: InstalledModel[] }>(REGISTRY_FILE);
    return registry?.models || [];
  }

  /**
   * Registers a new GGUF model via manual path.
   */
  static async registerModel(input: { path: string; name?: string; type?: string }): Promise<{ success: boolean; model?: InstalledModel; error?: string }> {
    const absolutePath = normalizePath(input.path);

    // 1. Basic Validation
    if (!path.isAbsolute(absolutePath)) {
      return { success: false, error: 'MODEL_PATH_NOT_ABSOLUTE' };
    }

    if (!fsSync.existsSync(absolutePath)) {
      return { success: false, error: 'GGUF_FILE_NOT_FOUND' };
    }

    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      return { success: false, error: 'PATH_IS_DIRECTORY' };
    }

    // 2. GGUF Format Check
    const validHeader = await isValidGguf(absolutePath);
    if (!validHeader) {
      return { success: false, error: 'GGUF_INVALID_HEADER' };
    }

    // 3. Duplicate Check
    const models = await this.getInstalledModels();
    const existing = models.find(m => m.path === absolutePath);
    if (existing) {
      return { success: true, model: existing }; // Return existing instead of erroring or duplicate
    }

    // 4. Create Model Object
    const fileName = path.basename(absolutePath, path.extname(absolutePath));
    const modelId = this.makeModelId(fileName);
    
    // Ensure unique ID
    let finalId = modelId;
    let counter = 1;
    while (models.find(m => m.id === finalId)) {
      finalId = `${modelId}-${counter++}`;
    }

    const modality: ModelModality = input.type === 'vision' ? 'vision_language' : 
                                  input.type === 'image' ? 'image_generation' : 'text';

    const newModel: InstalledModel = {
      id: finalId,
      name: input.name || fileName,
      type: (input.type as any) || 'text',
      modality,
      path: absolutePath,
      format: 'gguf',
      status: 'registered',
      sizeBytes: stats.size,
      addedAt: new Date().toISOString(),
      lastValidatedAt: new Date().toISOString(),
      validation: {
        valid: true,
        reason: null
      },
      autoLoad: false,
      capabilities: []
    };

    models.push(newModel);
    const saved = await writeJsonAtomic(REGISTRY_FILE, { models });
    
    if (!saved) return { success: false, error: 'INTERNAL_ERROR' };
    return { success: true, model: newModel };
  }

  /**
   * Removes a model from registry. Does NOT delete the physical file.
   */
  static async unregisterModel(modelId: string): Promise<boolean> {
    const models = await this.getInstalledModels();
    const filtered = models.filter(m => m.id !== modelId);
    
    if (models.length === filtered.length) return false;
    
    return await writeJsonAtomic(REGISTRY_FILE, { models: filtered });
  }

  /**
   * Makes a URL-friendly slug for model ID.
   */
  private static makeModelId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
