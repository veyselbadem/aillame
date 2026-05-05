// ============================================================
// Runtime Model Selection Contract
// ============================================================
// Pure helper functions for resolving model selection metadata.
// Does NOT start, stop, or switch any runtime.
// Does NOT read file system paths or forward localPath values.
// ============================================================

import type { LocalModelMetadata, ModelCapability } from './types';

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * Incoming model selection request — from a chat request, prompt header, or
 * admin setting. All fields are optional; absence means "use default".
 */
export interface RuntimeModelSelection {
  /** Requested model ID. */
  modelId?: string;
  /** Explicit provider hint (optional, informational only). */
  provider?: string;
  /** Explicit runtime hint (optional, informational only). */
  runtime?: string;
  /** Required capability (used to pick a default when modelId is absent). */
  capability?: ModelCapability;
  /** Where this selection came from — used for diagnostics. */
  source?: 'request' | 'default' | 'model-library' | 'admin-setting';
  /** Whether this selection has already been resolved against the library. */
  resolved?: boolean;
  /** Human-readable reason for this selection (diagnostics). */
  reason?: string;
}

/**
 * Result of resolving a RuntimeModelSelection against the local model library.
 */
export interface ResolvedRuntimeModel {
  /** True if a compatible model was found. */
  ok: boolean;
  /** The original selection request. */
  selection: RuntimeModelSelection;
  /** The matched model metadata (if found). */
  model?: LocalModelMetadata;
  /** Fallback model ID suggested when the primary was not available. */
  fallbackModelId?: string;
  /** Human-readable resolution reason. */
  reason: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Sanitize an external model ID — strips path separators and control chars. */
function sanitizeModelId(raw: string): string {
  return raw.replace(/[/\\.\x00-\x1f]+/g, '-').slice(0, 128).trim();
}

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a validated RuntimeModelSelection from raw input.
 * Sanitizes the modelId to prevent path injection.
 */
export function createRuntimeModelSelection(
  input: Partial<RuntimeModelSelection>,
): RuntimeModelSelection {
  return {
    modelId: input.modelId ? sanitizeModelId(input.modelId) : undefined,
    provider: input.provider,
    runtime: input.runtime,
    capability: input.capability,
    source: input.source ?? 'request',
    resolved: false,
  };
}

// ── Resolvers ─────────────────────────────────────────────────────────────

/**
 * Check whether a model satisfies a capability requirement.
 * Uses both the ModelCapability union and common string aliases.
 */
export function isModelCompatibleWithCapability(
  model: LocalModelMetadata,
  capability: ModelCapability,
): boolean {
  if (model.status !== 'available') return false;
  return model.capabilities.includes(capability);
}

/**
 * Find the first available model that supports the given capability.
 * Returns undefined if none found.
 */
export function getDefaultModelForCapability(
  models: LocalModelMetadata[],
  capability: ModelCapability,
): LocalModelMetadata | undefined {
  return models.find(m => isModelCompatibleWithCapability(m, capability));
}

/**
 * Resolve a RuntimeModelSelection against a list of local models.
 *
 * - If modelId is provided and found with status=available → ok: true.
 * - If modelId is provided but not found / not available → ok: false + reason.
 * - If modelId is absent but capability is provided → picks first available match.
 * - Falls back to the first available model regardless of capability.
 */
export function resolveRuntimeModelSelection(
  input: RuntimeModelSelection,
  models: LocalModelMetadata[],
): ResolvedRuntimeModel {
  const base: ResolvedRuntimeModel = { ok: false, selection: { ...input, resolved: true }, reason: '' };

  if (input.modelId) {
    const found = models.find(m => m.id === input.modelId);
    if (!found) {
      return { ...base, reason: `Model '${input.modelId}' not found in the local library.` };
    }
    if (found.status !== 'available') {
      const fallback = input.capability
        ? getDefaultModelForCapability(models, input.capability)
        : models.find(m => m.status === 'available');
      return {
        ...base,
        reason: `Model '${input.modelId}' is ${found.status}.`,
        fallbackModelId: fallback?.id,
      };
    }
    return { ok: true, selection: { ...input, resolved: true }, model: found, reason: 'Requested model found and available.' };
  }

  if (input.capability) {
    const byCapability = getDefaultModelForCapability(models, input.capability);
    if (byCapability) {
      return {
        ok: true,
        selection: { ...input, resolved: true, source: 'default' },
        model: byCapability,
        reason: `Default model selected for capability '${input.capability}'.`,
      };
    }
    return { ...base, reason: `No available model found for capability '${input.capability}'.` };
  }

  const anyAvailable = models.find(m => m.status === 'available');
  if (anyAvailable) {
    return {
      ok: true,
      selection: { ...input, resolved: true, source: 'default' },
      model: anyAvailable,
      reason: 'First available model selected as default.',
    };
  }

  return { ...base, reason: 'No available models in the local library.' };
}

/**
 * Produce a short human-readable summary of a resolved selection result.
 * Suitable for logs or diagnostic endpoints.
 */
export function summarizeRuntimeSelection(result: ResolvedRuntimeModel): string {
  if (result.ok && result.model) {
    return `[OK] ${result.model.id} (${result.model.provider}/${result.model.runtime}) — ${result.reason}`;
  }
  const fallback = result.fallbackModelId ? ` Fallback: ${result.fallbackModelId}.` : '';
  return `[FAIL] ${result.reason}${fallback}`;
}
