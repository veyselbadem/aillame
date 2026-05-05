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

export async function fetchModelLibrarySummary(): Promise<ModelLibrarySummary> {
  try {
    const res = await adminFetch('/api/admin/ai-lab/model-library-summary');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Özet alınamadı.');
    const s = json.summary;
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
