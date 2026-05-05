import { adminFetch } from '@/lib/admin-fetch';
import type {
  LocalModelMetadata,
  LocalModelStatus,
  ModelInstallRequest,
  ModelInstallResult,
  ModelRemoveRequest,
  ModelRemoveResult,
  LocalModelDiscoveryOptions,
} from '@/core/model-library/types';

// ── UI-facing DTO types ───────────────────────────────────────────────────

export type { LocalModelMetadata, LocalModelStatus };

export interface ModelLibraryListResponse {
  models: LocalModelMetadata[];
  total: number;
  available: number;
  missing: number;
}

export interface ModelLibrarySummary {
  totalModels: number;
  availableModels: number;
  missingModels: number;
  providers: string[];
  lastCheckedAt: string | null;
}

export interface ModelLibraryActionResult {
  ok: boolean;
  message: string;
  supported?: boolean;
  dryRun?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Bilinmeyen hata oluştu.';
}

// ── API calls ─────────────────────────────────────────────────────────────

export async function fetchModelLibraryList(): Promise<ModelLibraryListResponse> {
  try {
    const res = await fetch('/api/core/model-library/list');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Liste alınamadı.');
    const models: LocalModelMetadata[] = json.data?.models ?? [];
    const available = models.filter(m => m.status === 'available').length;
    const missing = models.filter(m => m.status === 'missing').length;
    return { models, total: models.length, available, missing };
  } catch (err) {
    console.error('[model-library-client] fetchModelLibraryList:', err);
    return { models: [], total: 0, available: 0, missing: 0 };
  }
}

export async function discoverModelLibrary(
  options?: Pick<LocalModelDiscoveryOptions, 'directories'>
): Promise<ModelLibraryListResponse> {
  try {
    const res = await fetch('/api/core/model-library/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directories: options?.directories }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Tarama başarısız.');
    const models: LocalModelMetadata[] = json.data?.models ?? [];
    const available = models.filter(m => m.status === 'available').length;
    const missing = models.filter(m => m.status === 'missing').length;
    return { models, total: models.length, available, missing };
  } catch (err) {
    console.error('[model-library-client] discoverModelLibrary:', err);
    return { models: [], total: 0, available: 0, missing: 0 };
  }
}

export async function fetchModelLibraryStatus(modelId: string): Promise<LocalModelStatus> {
  try {
    const res = await fetch(`/api/core/model-library/status?modelId=${encodeURIComponent(modelId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) return 'missing';
    return (json.data?.status as LocalModelStatus) ?? 'missing';
  } catch (err) {
    console.error('[model-library-client] fetchModelLibraryStatus:', err);
    return 'missing';
  }
}

export async function prepareModelInstall(
  request: ModelInstallRequest
): Promise<ModelLibraryActionResult> {
  try {
    const res = await fetch('/api/core/model-library/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Kurulum isteği başarısız.');
    const result: ModelInstallResult = json.data;
    return {
      ok: result.ok,
      message: result.message,
      supported: result.supported,
    };
  } catch (err) {
    return { ok: false, message: `Kurulum hazırlanamadı: ${formatError(err)}` };
  }
}

export async function dryRunRemoveModel(modelId: string): Promise<ModelLibraryActionResult> {
  const req: ModelRemoveRequest = { modelId, dryRun: true, confirmDelete: false };
  try {
    const res = await fetch('/api/core/model-library/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Simülasyon başarısız.');
    const result: ModelRemoveResult = json.data;
    return {
      ok: result.ok,
      message: result.message,
      dryRun: result.dryRun,
    };
  } catch (err) {
    return { ok: false, message: `Kaldırma simülasyonu başarısız: ${formatError(err)}`, dryRun: true };
  }
}

// ── Preferences types ─────────────────────────────────────────────────────

export type DefaultModelCapabilityUi =
  | 'text'
  | 'code'
  | 'image'
  | 'vision'
  | 'embedding';

export interface DefaultModelPreferencesUi {
  textModelId?: string;
  codeModelId?: string;
  imageModelId?: string;
  visionModelId?: string;
  embeddingModelId?: string;
  updatedAt: string;
  source: string;
}

export interface ModelPreferenceUpdateResult {
  ok: boolean;
  message: string;
  preferences?: DefaultModelPreferencesUi;
}

const ALLOWED_CAPABILITIES_UI: ReadonlySet<DefaultModelCapabilityUi> = new Set([
  'text',
  'code',
  'image',
  'vision',
  'embedding',
]);

// ── Preference API calls ──────────────────────────────────────────────────

export async function fetchModelPreferences(): Promise<DefaultModelPreferencesUi> {
  try {
    const res = await adminFetch('/api/admin/model-library/preferences');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Tercihler alınamadı.');
    const d = json.data as Partial<DefaultModelPreferencesUi>;
    return {
      textModelId: typeof d?.textModelId === 'string' ? d.textModelId : undefined,
      codeModelId: typeof d?.codeModelId === 'string' ? d.codeModelId : undefined,
      imageModelId: typeof d?.imageModelId === 'string' ? d.imageModelId : undefined,
      visionModelId: typeof d?.visionModelId === 'string' ? d.visionModelId : undefined,
      embeddingModelId: typeof d?.embeddingModelId === 'string' ? d.embeddingModelId : undefined,
      updatedAt: typeof d?.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
      source: typeof d?.source === 'string' ? d.source : 'default',
    };
  } catch (err) {
    console.error('[model-library-client] fetchModelPreferences:', err);
    return { updatedAt: new Date().toISOString(), source: 'default' };
  }
}

export async function updateModelPreference(
  capability: DefaultModelCapabilityUi,
  modelId?: string,
): Promise<ModelPreferenceUpdateResult> {
  if (!ALLOWED_CAPABILITIES_UI.has(capability)) {
    return { ok: false, message: 'Geçersiz capability değeri.' };
  }
  try {
    const res = await adminFetch('/api/admin/model-library/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability, modelId: modelId ?? null, source: 'admin' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Tercih güncellenemedi.');
    const d = json.data as Partial<DefaultModelPreferencesUi>;
    return {
      ok: true,
      message: 'Varsayılan model güncellendi.',
      preferences: {
        textModelId: typeof d?.textModelId === 'string' ? d.textModelId : undefined,
        codeModelId: typeof d?.codeModelId === 'string' ? d.codeModelId : undefined,
        imageModelId: typeof d?.imageModelId === 'string' ? d.imageModelId : undefined,
        visionModelId: typeof d?.visionModelId === 'string' ? d.visionModelId : undefined,
        embeddingModelId: typeof d?.embeddingModelId === 'string' ? d.embeddingModelId : undefined,
        updatedAt: typeof d?.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
        source: typeof d?.source === 'string' ? d.source : 'admin',
      },
    };
  } catch (err) {
    return { ok: false, message: `Tercih güncellenemedi: ${formatError(err)}` };
  }
}

export async function clearModelPreference(
  capability: DefaultModelCapabilityUi,
): Promise<ModelPreferenceUpdateResult> {
  return updateModelPreference(capability, undefined);
}

export async function fetchModelLibrarySummary(): Promise<ModelLibrarySummary> {
  try {
    const res = await adminFetch('/api/admin/ai-lab/model-library-summary');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Özet alınamadı.');
    const s = json.data;
    return {
      totalModels: s?.totalModels ?? 0,
      availableModels: s?.availableModels ?? 0,
      missingModels: s?.missingModels ?? 0,
      providers: s?.providers ?? [],
      lastCheckedAt: s?.lastCheckedAt ?? null,
    };
  } catch (err) {
    console.error('[model-library-client] fetchModelLibrarySummary:', err);
    return { totalModels: 0, availableModels: 0, missingModels: 0, providers: [], lastCheckedAt: null };
  }
}
