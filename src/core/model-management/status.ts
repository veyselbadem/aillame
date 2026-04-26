import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MODEL_REGISTRY, getModel, type ManagedModel } from '@core/models/registry';

export type ModelInstallStatus = {
  id: string;
  label: string;
  purpose: ManagedModel['purpose'];
  tier: ManagedModel['tier'];
  runtime: ManagedModel['runtime'];
  repoId?: string;
  sizeLabel: string;
  capabilities: ManagedModel['capabilities'];
  description: string;
  installHint: string;
  installed: boolean;
  builtIn: boolean;
  cachePath?: string;
  runtimeAvailable: boolean;
};

function repoToCacheDir(repoId: string): string {
  return `models--${repoId.replace('/', '--')}`;
}

function getPossibleCacheRoots(): string[] {
  return [
    process.env.HF_HUB_CACHE,
    process.env.TRANSFORMERS_CACHE,
    process.env.HF_HOME ? path.join(process.env.HF_HOME, 'hub') : undefined,
    path.join(os.homedir(), '.cache', 'huggingface', 'hub'),
  ].filter(Boolean) as string[];
}

function findModelCache(repoId?: string): string | undefined {
  if (!repoId) return undefined;
  const cacheDir = repoToCacheDir(repoId);
  return getPossibleCacheRoots()
    .map((root) => path.join(root, cacheDir))
    .find((candidate) => fs.existsSync(candidate));
}

function runtimeLikelyAvailable(model: ManagedModel): boolean {
  if (model.builtIn || model.runtime === 'rust-candle') return true;
  return Boolean(process.env.AILLAME_PYTHON || process.env.PATH);
}

export function getModelInstallStatus(modelId: string): ModelInstallStatus {
  const model = getModel(modelId);
  const cachePath = findModelCache(model.repoId);
  const installed = Boolean(model.builtIn || cachePath);

  return {
    id: model.id,
    label: model.label,
    purpose: model.purpose,
    tier: model.tier,
    runtime: model.runtime,
    repoId: model.repoId,
    sizeLabel: model.sizeLabel,
    capabilities: model.capabilities,
    description: model.description,
    installHint: model.installHint,
    installed,
    builtIn: Boolean(model.builtIn),
    cachePath,
    runtimeAvailable: runtimeLikelyAvailable(model),
  };
}

export function getAllModelInstallStatuses(): ModelInstallStatus[] {
  return Object.keys(MODEL_REGISTRY).map(getModelInstallStatus);
}
