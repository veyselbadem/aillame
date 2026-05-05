import fs from 'fs';
import path from 'path';

export type DefaultModelCapability =
  | 'text'
  | 'code'
  | 'image'
  | 'vision'
  | 'embedding';

export type DefaultModelPreferenceSource = 'default' | 'admin' | 'system';

export interface DefaultModelPreferences {
  textModelId?: string;
  codeModelId?: string;
  imageModelId?: string;
  visionModelId?: string;
  embeddingModelId?: string;
  updatedAt: string;
  source: DefaultModelPreferenceSource;
}

export interface ModelPreferenceUpdate {
  capability: DefaultModelCapability;
  modelId?: string;
  source?: DefaultModelPreferenceSource;
}

const PREFERENCES_FILE = path.join(
  process.cwd(),
  'data',
  'model-library',
  'preferences.json',
);

function ensurePreferencesDirectory(): void {
  const dir = path.dirname(PREFERENCES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeModelId(modelId?: string | null): string | undefined {
  if (typeof modelId !== 'string') return undefined;

  const trimmed = modelId.trim();
  if (!trimmed) return undefined;

  const sanitized = trimmed
    .replace(/[\\/\x00-\x1f]/g, '')
    .replace(/[^a-zA-Z0-9:_.\-]/g, '')
    .slice(0, 128);

  return sanitized || undefined;
}

export function createDefaultModelPreferences(): DefaultModelPreferences {
  return {
    updatedAt: new Date().toISOString(),
    source: 'default',
  };
}

export function normalizeDefaultModelPreferences(
  input: Partial<DefaultModelPreferences> | unknown,
): DefaultModelPreferences {
  const base = createDefaultModelPreferences();

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return base;
  }

  const raw = input as Partial<DefaultModelPreferences>;
  const source = raw.source === 'admin' || raw.source === 'system' ? raw.source : 'default';

  return {
    textModelId: sanitizeModelId(raw.textModelId),
    codeModelId: sanitizeModelId(raw.codeModelId),
    imageModelId: sanitizeModelId(raw.imageModelId),
    visionModelId: sanitizeModelId(raw.visionModelId),
    embeddingModelId: sanitizeModelId(raw.embeddingModelId),
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
      ? raw.updatedAt
      : base.updatedAt,
    source,
  };
}

export function saveDefaultModelPreferences(
  preferences: Partial<DefaultModelPreferences>,
): DefaultModelPreferences {
  const normalized = normalizeDefaultModelPreferences({
    ...preferences,
    updatedAt: new Date().toISOString(),
  });

  try {
    ensurePreferencesDirectory();
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(normalized, null, 2), 'utf8');
    return normalized;
  } catch (error) {
    console.error('[model-preferences] save failed:', error);
    return normalized;
  }
}

export function getDefaultModelPreferences(): DefaultModelPreferences {
  if (!fs.existsSync(PREFERENCES_FILE)) {
    return createDefaultModelPreferences();
  }

  try {
    const raw = fs.readFileSync(PREFERENCES_FILE, 'utf8');
    if (!raw.trim()) return createDefaultModelPreferences();
    return normalizeDefaultModelPreferences(JSON.parse(raw));
  } catch (error) {
    console.error('[model-preferences] load failed:', error);
    return createDefaultModelPreferences();
  }
}

export function getPreferredModelIdForCapability(
  capability: DefaultModelCapability,
): string | undefined {
  const preferences = getDefaultModelPreferences();
  const key = `${capability}ModelId` as const;
  return sanitizeModelId(preferences[key]);
}

export function updateDefaultModelPreference(
  update: ModelPreferenceUpdate,
): DefaultModelPreferences {
  const current = getDefaultModelPreferences();
  const key = `${update.capability}ModelId` as const;
  const nextModelId = sanitizeModelId(update.modelId);

  const next: DefaultModelPreferences = {
    ...current,
    [key]: nextModelId,
    source: update.source ?? 'admin',
    updatedAt: new Date().toISOString(),
  };

  return saveDefaultModelPreferences(next);
}
