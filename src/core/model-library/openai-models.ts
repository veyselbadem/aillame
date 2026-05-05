// ============================================================
// Model Library → External API (OpenAI-compatible) Mapper
// ============================================================
// Maps LocalModelMetadata to OpenAI-compatible model records
// with extended Aillame-specific fields.
// Pure helpers — no side effects, no imports from inference.
// ============================================================

import type { LocalModelMetadata } from './types';
import type { ManagedModel } from '../models/types';

export interface OpenAIModelRecord {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
  permission: [];
  root: string;
  parent: null;
  // Extended Aillame fields (non-breaking)
  provider?: string;
  runtime?: string;
  capabilities?: string[];
  status?: string;
}

export interface OpenAIModelList {
  object: 'list';
  data: OpenAIModelRecord[];
}

/** Convert a LocalModelMetadata to an OpenAI-compatible model record. */
export function localModelToOpenAIRecord(model: LocalModelMetadata): OpenAIModelRecord {
  return {
    id: model.id,
    object: 'model',
    created: model.createdAt ? Math.floor(new Date(model.createdAt).getTime() / 1000) : 0,
    owned_by: 'aillame',
    permission: [],
    root: model.id,
    parent: null,
    provider: model.provider,
    runtime: model.runtime,
    capabilities: model.capabilities,
    status: model.status,
  };
}

/** Convert a ManagedModel (static registry) to an OpenAI-compatible model record. */
export function managedModelToOpenAIRecord(model: ManagedModel): OpenAIModelRecord {
  return {
    id: model.id,
    object: 'model',
    created: 0,
    owned_by: 'aillame',
    permission: [],
    root: model.id,
    parent: null,
    provider: model.family ?? model.tier,
    runtime: model.runtime,
    capabilities: model.capabilities,
    status: model.enabled === false ? 'disabled' : 'available',
  };
}

/**
 * Merge managed (static registry) models with locally discovered model-library
 * models. Static registry models take precedence; model-library models with
 * duplicate IDs are skipped.
 */
export function buildExternalApiModelList(
  managedModels: ManagedModel[],
  localModels: LocalModelMetadata[],
): OpenAIModelList {
  const seenIds = new Set<string>();
  const data: OpenAIModelRecord[] = [];

  for (const m of managedModels) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      data.push(managedModelToOpenAIRecord(m));
    }
  }

  for (const m of localModels) {
    if (!seenIds.has(m.id) && m.status === 'available') {
      seenIds.add(m.id);
      data.push(localModelToOpenAIRecord(m));
    }
  }

  return { object: 'list', data };
}
