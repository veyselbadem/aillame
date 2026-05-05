import {
  type LocalModelMetadata,
  type ModelCapability,
  type ModelProviderKind,
  type ModelRegistrySnapshot,
} from './types';
import { sanitizeModelId } from './paths';

export function createModelRegistrySnapshot(models: LocalModelMetadata[]): ModelRegistrySnapshot {
  return {
    models: models.map((model) => normalizeModelMetadata(model)),
    updatedAt: new Date().toISOString(),
    source: 'model-library',
  };
}

export function normalizeModelMetadata(input: Partial<LocalModelMetadata>): LocalModelMetadata {
  const now = new Date().toISOString();
  const name = (input.name || '').trim() || 'Unnamed Model';
  const id = sanitizeModelId(input.id || name) || `model-${Date.now()}`;

  return {
    id,
    name,
    provider: input.provider || 'custom',
    runtime: input.runtime || 'unknown',
    capabilities: Array.isArray(input.capabilities) && input.capabilities.length > 0
      ? Array.from(new Set(input.capabilities))
      : ['unknown'],
    status: input.status || 'missing',
    source: (input.source || 'local').trim() || 'local',
    localPath: input.localPath,
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    quantization: input.quantization,
    contextSize: input.contextSize,
    description: input.description,
    tags: input.tags,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    lastCheckedAt: input.lastCheckedAt || now,
    error: input.error,
  };
}

export function mergeModelRegistries(
  base: LocalModelMetadata[],
  discovered: LocalModelMetadata[],
): LocalModelMetadata[] {
  const byId = new Map<string, LocalModelMetadata>();

  for (const item of base) {
    const normalized = normalizeModelMetadata(item);
    byId.set(normalized.id, normalized);
  }

  for (const item of discovered) {
    const normalized = normalizeModelMetadata(item);
    const existing = byId.get(normalized.id);
    byId.set(normalized.id, {
      ...(existing || {}),
      ...normalized,
      capabilities: Array.from(new Set([...(existing?.capabilities || []), ...normalized.capabilities])),
      updatedAt: new Date().toISOString(),
      lastCheckedAt: normalized.lastCheckedAt || new Date().toISOString(),
    });
  }

  return Array.from(byId.values());
}

export function findModelById(models: LocalModelMetadata[], id: string): LocalModelMetadata | undefined {
  const normalizedId = sanitizeModelId(id);
  return models.find((model) => model.id === normalizedId);
}

export function filterModelsByCapability(
  models: LocalModelMetadata[],
  capability: ModelCapability,
): LocalModelMetadata[] {
  return models.filter((model) => model.capabilities.includes(capability));
}

export function filterModelsByProvider(
  models: LocalModelMetadata[],
  provider: ModelProviderKind,
): LocalModelMetadata[] {
  return models.filter((model) => model.provider === provider);
}

export function markModelMissing(model: LocalModelMetadata, error?: string): LocalModelMetadata {
  return {
    ...model,
    status: 'missing',
    error,
    lastCheckedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function markModelAvailable(model: LocalModelMetadata): LocalModelMetadata {
  return {
    ...model,
    status: 'available',
    error: undefined,
    lastCheckedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
