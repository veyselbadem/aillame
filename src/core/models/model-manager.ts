// ============================================================
// Aillame Model Manager (FAZ 2)
// ============================================================
// Aggregates registry metadata with live runtime status.
// Does NOT start or control any runtime.
// ============================================================

import {
  getAllModels,
  getEnabledModels,
  MODEL_REGISTRY,
} from './registry';
import type { ManagedModel, ModelWithStatus, ModelStatusValue } from './types';
import { getTextRuntimeRouterStatus } from '../inference/text-runtime-router';
import type { LabParticipant } from '../ai-lab/types';

// ---- Path resolution -------------------------------------------

/**
 * Resolves a model's local file path from environment variables.
 * Checks `localPathEnv` first, then `modelPathEnv` (FAZ 1 compat).
 * Returns undefined without throwing if no env var is set.
 */
export function resolveModelPath(model: ManagedModel): string | undefined {
  const envKey = model.localPathEnv ?? model.modelPathEnv;
  if (!envKey) return undefined;
  const resolved = process.env[envKey];
  return resolved || undefined;
}

// ---- Status determination --------------------------------------

function buildModelStatus(
  model: ManagedModel,
  internalTextHealthy: boolean,
): ModelWithStatus {
  const warnings: string[] = [];

  // Disabled
  if (model.enabled === false) {
    return { model, status: 'disabled' };
  }

  // Experimental
  if (model.experimental) {
    warnings.push('This model is experimental and may be unstable.');
  }

  // Check path requirement
  const pathEnvKey = model.localPathEnv ?? model.modelPathEnv;
  let resolvedPath: string | undefined;

  if (pathEnvKey) {
    resolvedPath = process.env[pathEnvKey];
    if (!resolvedPath) {
      warnings.push(`Required env var "${pathEnvKey}" is not set.`);
      return { model, status: 'missing-config', warnings };
    }
  }

  // Runtime-specific health checks
  if (model.runtime === 'internal-text' || model.runtime === 'llama-server-gguf') {
    if (!internalTextHealthy) {
      warnings.push('Internal text runtime is not healthy.');
      const status: ModelStatusValue = model.experimental ? 'experimental' : 'configured';
      return { model, status, resolvedPath, warnings };
    }
    return {
      model,
      status: 'available',
      resolvedPath,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  // Built-in models (Nano) — always available
  if (model.builtIn) {
    return {
      model,
      status: 'available',
      warnings: warnings.length ? warnings : undefined,
    };
  }

  // Models that need a path but we couldn't determine liveness
  const status: ModelStatusValue = model.experimental ? 'experimental' : 'configured';
  return {
    model,
    status,
    resolvedPath,
    warnings: warnings.length ? warnings : undefined,
  };
}

// ---- Public API ------------------------------------------------

/**
 * Returns all enabled models (enabled !== false).
 * Does not perform async status checks.
 */
export function getAvailableModels(): ManagedModel[] {
  return getEnabledModels();
}

/**
 * Returns the live status for a single model.
 * Reads Internal Text Runtime status if relevant.
 */
export async function getModelWithStatus(modelId: string): Promise<ModelWithStatus> {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    return {
      model: { id: modelId, label: modelId, tier: 'nano', purpose: 'chat', runtime: 'rust-candle', capabilities: [], sizeLabel: '', description: '', installHint: '' },
      status: 'unknown',
      warnings: [`Model "${modelId}" not found in registry.`],
    };
  }

  let internalTextHealthy = false;
  try {
    const runtimeStatus = await getTextRuntimeRouterStatus();
    internalTextHealthy = runtimeStatus.enabled && runtimeStatus.health === 'healthy';
  } catch {
    // Runtime not available — keep false
  }

  return buildModelStatus(model, internalTextHealthy);
}

/**
 * Returns live status for all registered models.
 * Makes a single internal-text runtime status call shared across all entries.
 */
export async function getModelsWithStatus(): Promise<ModelWithStatus[]> {
  let internalTextHealthy = false;
  try {
    const runtimeStatus = await getTextRuntimeRouterStatus();
    internalTextHealthy = runtimeStatus.enabled && runtimeStatus.health === 'healthy';
  } catch {
    // Runtime not available — keep false
  }

  return getAllModels().map((model) => buildModelStatus(model, internalTextHealthy));
}

/**
 * Returns the list of AI Lab participants derived from enabled models.
 * Mapped conservatively to the existing LabParticipant union to avoid
 * breaking AI Lab session logic.
 *
 * Currently returns a safe static list of known participants that
 * have enabled models. Ileride model registry'den dinamik türetilebilir.
 */
export function getAvailableParticipants(): LabParticipant[] {
  const enabled = getEnabledModels();
  const participants = new Set<LabParticipant>();

  // Always include system
  participants.add('system');

  for (const model of enabled) {
    switch (model.runtime) {
      case 'rust-candle':
        participants.add('nano');
        break;
      case 'internal-text':
      case 'llama-server-gguf':
        if (model.internalTextProvider === 'gemma' || model.family === 'gemma') {
          participants.add('gemma');
        }
        break;
      case 'ollama':
        participants.add('ollama');
        break;
      case 'python-transformers':
        if (model.family === 'qwen') {
          participants.add('qwen');
        }
        break;
      case 'python-diffusers':
        // SDXL is disabled by default — only add if enabled
        if (model.enabled !== false) {
          participants.add('sdxl');
        }
        break;
      default:
        break;
    }
  }

  return Array.from(participants);
}
