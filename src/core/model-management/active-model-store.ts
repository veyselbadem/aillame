/**
 * Active Model Store
 * Persists the user's active chat and image model selections to disk.
 * File: .aillame-data/stores/active-model-selection.json
 */
import fs from 'fs';
import path from 'path';

export type ActiveModelSelection = {
  activeChatModelId: string | null;
  activeImageModelId: string | null;
  updatedAt: string;
};

const STORE_PATH = path.join(process.cwd(), '.aillame-data', 'stores', 'active-model-selection.json');

const DEFAULT_SELECTION: ActiveModelSelection = {
  activeChatModelId: null,
  activeImageModelId: null,
  updatedAt: new Date().toISOString(),
};

export function readActiveModelSelection(): ActiveModelSelection {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        activeChatModelId: typeof parsed.activeChatModelId === 'string' ? parsed.activeChatModelId : null,
        activeImageModelId: typeof parsed.activeImageModelId === 'string' ? parsed.activeImageModelId : null,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // return default on any error
  }
  return { ...DEFAULT_SELECTION };
}

export function writeActiveModelSelection(update: Partial<Omit<ActiveModelSelection, 'updatedAt'>>): ActiveModelSelection {
  const current = readActiveModelSelection();
  const next: ActiveModelSelection = {
    activeChatModelId: 'activeChatModelId' in update ? (update.activeChatModelId ?? null) : current.activeChatModelId,
    activeImageModelId: 'activeImageModelId' in update ? (update.activeImageModelId ?? null) : current.activeImageModelId,
    updatedAt: new Date().toISOString(),
  };
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

export function getActiveChatModelId(): string | null {
  return readActiveModelSelection().activeChatModelId;
}

export function getActiveImageModelId(): string | null {
  return readActiveModelSelection().activeImageModelId;
}

export function setActiveChatModelId(modelId: string | null): ActiveModelSelection {
  return writeActiveModelSelection({ activeChatModelId: modelId });
}

export function setActiveImageModelId(modelId: string | null): ActiveModelSelection {
  return writeActiveModelSelection({ activeImageModelId: modelId });
}
