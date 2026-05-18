import path from 'path';
import fsSync from 'fs';
import { 
  readJsonSafe, 
  writeJsonAtomic, 
  STATE_DIR, 
  isValidGguf 
} from '../../utils/fs-helpers';
import { InstalledModelRegistryService, InstalledModel } from './installed-model-registry.service';
import { setActiveChatModelId, getActiveChatModelId } from '../../core/model-management/active-model-store';

export interface ActiveModelState {
  text: {
    modelId: string;
    path: string;
    selectedAt: string;
  } | null;
  image: null;
  code: null;
  vision: null;
  _metadata?: {
    isConsistent: boolean;
    localStoreId: string | null;
  };
}

const STATE_FILE = path.join(STATE_DIR, 'active-model.json');

export class ActiveModelStateService {
  /**
   * Returns current active model state with consistency metadata.
   */
  static async getActiveState(): Promise<ActiveModelState> {
    let state = await readJsonSafe<ActiveModelState>(STATE_FILE);
    
    // Fallback: If canonical state is missing but local store has one, try to reconstruct
    if (!state && getActiveChatModelId()) {
      const localId = getActiveChatModelId()!;
      const installed = await InstalledModelRegistryService.getInstalledModels();
      const model = installed.find(m => m.id === localId);
      if (model) {
        state = {
          text: {
            modelId: model.id,
            path: model.path,
            selectedAt: new Date().toISOString()
          },
          image: null,
          code: null,
          vision: null
        };
        await writeJsonAtomic(STATE_FILE, state);
      }
    }

    const finalState: ActiveModelState = state || { text: null, image: null, code: null, vision: null };
    
    // Consistency check
    const localId = getActiveChatModelId();
    finalState._metadata = {
      isConsistent: finalState.text?.modelId === localId,
      localStoreId: localId
    };

    return finalState;
  }

  /**
   * Selects a model as the active model for a specific type and syncs with local store.
   */
  static async selectModel(modelId: string, type: 'text' = 'text'): Promise<{ success: boolean; state?: ActiveModelState; error?: string }> {
    const installed = await InstalledModelRegistryService.getInstalledModels();
    const model = installed.find(m => m.id === modelId);

    if (!model) {
      return { success: false, error: 'MODEL_NOT_FOUND' };
    }

    if (model.status !== 'registered') {
      return { success: false, error: 'MODEL_NOT_SELECTABLE' };
    }

    if (!model.validation.valid) {
      return { success: false, error: 'MODEL_INVALID' };
    }

    const currentState = await this.getActiveState();
    currentState[type] = {
      modelId: model.id,
      path: model.path,
      selectedAt: new Date().toISOString()
    };

    // 1. Update Canonical Store
    const saved = await writeJsonAtomic(STATE_FILE, currentState);
    if (!saved) return { success: false, error: 'INTERNAL_ERROR' };
    
    // 2. Sync with Local Store (UI/Legacy compatibility)
    if (type === 'text') {
      setActiveChatModelId(modelId);
    }
    
    return { success: true, state: currentState };
  }

  /**
   * Validates the active model on startup or request.
   */
  static async validateActiveModel(): Promise<{ valid: boolean; state: ActiveModelState; reason?: string }> {
    const state = await this.getActiveState();
    
    if (!state.text) {
      return { valid: true, state };
    }

    const { modelId, path: modelPath } = state.text;

    // 1. Check if registered
    const installed = await InstalledModelRegistryService.getInstalledModels();
    const model = installed.find(m => m.id === modelId);
    
    if (!model || model.status !== 'registered') {
      await this.clearActiveModel('text');
      return { valid: false, state: await this.getActiveState(), reason: 'ACTIVE_MODEL_INVALID_OR_MISSING' };
    }

    // 2. Check if file exists
    if (!fsSync.existsSync(modelPath)) {
      await this.clearActiveModel('text');
      return { valid: false, state: await this.getActiveState(), reason: 'ACTIVE_MODEL_FILE_NOT_FOUND' };
    }

    // 3. Verify magic number
    const valid = await isValidGguf(modelPath);
    if (!valid) {
      await this.clearActiveModel('text');
      return { valid: false, state: await this.getActiveState(), reason: 'ACTIVE_MODEL_INVALID_FORMAT' };
    }

    return { valid: true, state };
  }

  /**
   * Clears active model for a specific type and syncs with local store.
   */
  static async clearActiveModel(type: 'text' | 'image' | 'code' | 'vision'): Promise<void> {
    const state = await this.getActiveState();
    state[type] = null;
    await writeJsonAtomic(STATE_FILE, state);
    
    if (type === 'text') {
      setActiveChatModelId(null);
    }
  }
}
