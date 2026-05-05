import { ensureSafeModelId } from './model-selection';

export interface OllamaModelAvailability {
  ok: boolean;
  available: boolean;
  modelId: string;
  normalizedModelId: string;
  checkedAt: string;
  reason?: string;
  models?: string[];
}

interface OllamaAvailabilityOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

function normalizeOllamaBaseUrl(value?: string): string {
  const raw = (value || process.env.AILLAME_OLLAMA_BASE_URL || 'http://127.0.0.1:11434').trim();
  return raw.replace(/\/+$/, '').replace(/\/api$/i, '');
}

function isSafeLocalOllamaUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:') return false;
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '[::1]';
  } catch {
    return false;
  }
}

export function normalizeOllamaModelName(name?: string): string {
  return ensureSafeModelId(name) || '';
}

export async function listOllamaModels(
  options: OllamaAvailabilityOptions = {},
): Promise<OllamaModelAvailability> {
  const checkedAt = new Date().toISOString();
  const baseUrl = normalizeOllamaBaseUrl(options.baseUrl);
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1000, Number(options.timeoutMs)) : 5000;

  if (!isSafeLocalOllamaUrl(baseUrl)) {
    return {
      ok: false,
      available: false,
      modelId: '',
      normalizedModelId: '',
      checkedAt,
      reason: 'Unsafe Ollama URL. Only local http endpoints are allowed.',
      models: [],
    };
  }

  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return {
        ok: false,
        available: false,
        modelId: '',
        normalizedModelId: '',
        checkedAt,
        reason: `Ollama tags endpoint failed with HTTP ${res.status}.`,
        models: [],
      };
    }

    const body = await res.json();
    const models = Array.isArray(body?.models)
      ? body.models
          .map((m: { name?: unknown }) => (typeof m?.name === 'string' ? normalizeOllamaModelName(m.name) : ''))
          .filter(Boolean)
      : [];

    return {
      ok: true,
      available: models.length > 0,
      modelId: '',
      normalizedModelId: '',
      checkedAt,
      models,
    };
  } catch {
    return {
      ok: false,
      available: false,
      modelId: '',
      normalizedModelId: '',
      checkedAt,
      reason: 'Ollama server is offline or unreachable.',
      models: [],
    };
  }
}

export async function checkOllamaModelAvailability(
  modelId: string,
  options: OllamaAvailabilityOptions = {},
): Promise<OllamaModelAvailability> {
  const checkedAt = new Date().toISOString();
  const normalizedModelId = normalizeOllamaModelName(modelId);

  if (!normalizedModelId) {
    return {
      ok: false,
      available: false,
      modelId,
      normalizedModelId: '',
      checkedAt,
      reason: 'Invalid modelId.',
    };
  }

  const listed = await listOllamaModels(options);
  const models = listed.models || [];

  if (!listed.ok) {
    return {
      ok: false,
      available: false,
      modelId,
      normalizedModelId,
      checkedAt,
      reason: listed.reason || 'Ollama tags check failed.',
      models,
    };
  }

  const available = models.includes(normalizedModelId);
  return {
    ok: true,
    available,
    modelId,
    normalizedModelId,
    checkedAt,
    reason: available ? undefined : 'Model not found in Ollama tags list.',
    models,
  };
}
