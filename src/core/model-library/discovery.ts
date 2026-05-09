import fs from 'fs';
import path from 'path';
import {
  type LocalModelDiscoveryOptions,
  type LocalModelMetadata,
  type ModelProviderKind,
} from './types';
import {
  getDefaultModelLibraryRoot,
  getAllowedModelRoots,
  getModelFileRuntimeKind,
  isProbablyModelFile,
  normalizeLocalModelPath,
  sanitizeModelId,
} from './paths';
import { normalizeModelMetadata } from './model-registry';

const SKIP_DIRECTORIES = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'runtime',
  'target',
]);

function inferProviderFromFileName(fileName: string): ModelProviderKind {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('gemma')) return 'gemma';
  if (normalized.includes('ollama')) return 'ollama';
  if (normalized.includes('sdxl')) return 'sdxl';
  if (normalized.includes('comfy')) return 'comfyui';
  if (normalized.includes('janus')) return 'janus';
  if (normalized.includes('aillame') || normalized.includes('nano')) return 'aillame';
  return 'custom';
}

function getAllowedExtensions(options?: LocalModelDiscoveryOptions): Set<string> {
  const configured = options?.allowedExtensions?.map((ext) => ext.toLowerCase().trim()).filter(Boolean);
  const fallback = ['.gguf', '.safetensors', '.onnx', '.bin', '.pt', '.pth', '.ckpt'];
  return new Set((configured && configured.length > 0 ? configured : fallback).map((ext) => ext.startsWith('.') ? ext : `.${ext}`));
}

export function safeReadDirectory(directory: string): fs.Dirent[] {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

export function createMetadataFromModelFile(filePath: string, stats?: fs.Stats): LocalModelMetadata {
  const normalizedPath = normalizeLocalModelPath(filePath);
  const fileName = path.basename(normalizedPath);
  const runtime = getModelFileRuntimeKind(fileName);
  const now = new Date().toISOString();

  return normalizeModelMetadata({
    id: sanitizeModelId(path.basename(fileName, path.extname(fileName))),
    name: path.basename(fileName, path.extname(fileName)) || fileName,
    provider: inferProviderFromFileName(fileName),
    runtime,
    capabilities: runtime === 'diffusers' ? ['image'] : ['text'],
    status: 'available',
    source: 'discovery',
    localPath: normalizedPath,
    fileName,
    sizeBytes: stats?.size,
    lastCheckedAt: now,
    updatedAt: now,
  });
}

function shouldSkipDirectory(name: string): boolean {
  const normalized = (name || '').toLowerCase();
  return SKIP_DIRECTORIES.has(normalized);
}

export function discoverModelsInDirectory(
  directory: string,
  options: LocalModelDiscoveryOptions = {},
): LocalModelMetadata[] {
  const root = normalizeLocalModelPath(directory);
  if (!root || !fs.existsSync(root)) return [];

  const maxDepth = Number.isFinite(options.maxDepth) ? Math.max(0, Math.min(options.maxDepth || 2, 5)) : 2;
  const allowedExtensions = getAllowedExtensions(options);
  const found: LocalModelMetadata[] = [];

  const walk = (currentDir: string, depth: number): void => {
    if (depth > maxDepth) return;

    for (const entry of safeReadDirectory(currentDir)) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name)) continue;
        walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!allowedExtensions.has(extension)) continue;
      if (!isProbablyModelFile(entry.name)) continue;

      let stats: fs.Stats | undefined;
      try {
        stats = fs.statSync(fullPath);
      } catch {
        continue;
      }

      found.push(createMetadataFromModelFile(fullPath, stats));
    }
  };

  walk(root, 0);
  return found;
}

import { listOllamaModels } from '../inference/ollama-availability';
import { MODEL_REGISTRY } from '../models/registry';

export function getDefaultDiscoveryDirectories(): string[] {
  return getAllowedModelRoots();
}

export async function discoverLocalModels(options: LocalModelDiscoveryOptions = {}): Promise<LocalModelMetadata[]> {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const directories = options.directories && options.directories.length > 0
    ? options.directories.map(normalizeLocalModelPath).filter(Boolean)
    : getDefaultDiscoveryDirectories();

  const merged = new Map<string, LocalModelMetadata>();

  // 1. Physical file discovery
  for (const directory of directories) {
    const discovered = discoverModelsInDirectory(directory, options);
    for (const model of discovered) {
      merged.set(model.id, model);
    }
  }

  // 2. Ollama discovery
  try {
    const ollama = await listOllamaModels({ timeoutMs: 2000 });
    if (ollama.ok && Array.isArray(ollama.models)) {
      for (const name of ollama.models) {
        const id = sanitizeModelId(`ollama-${name}`);
        const now = new Date().toISOString();
        merged.set(id, normalizeModelMetadata({
          id,
          name,
          provider: 'ollama',
          runtime: 'ollama',
          capabilities: ['text', 'chat'],
          status: 'available',
          source: 'ollama-api',
          lastCheckedAt: now,
          updatedAt: now,
          description: `Ollama-managed model: ${name}`,
        }));
      }
    }
  } catch (err) {
    console.error('[discovery] Ollama discovery failed:', err);
  }

  // 3. Managed Registry discovery (HF Cache)
  for (const model of Object.values(MODEL_REGISTRY)) {
    if (model.builtIn) continue;
    if (!model.repoId) continue;

    const folderName = `models--${model.repoId.replace('/', '--')}`;
    const fullPath = path.join(homeDir, '.cache', 'huggingface', 'hub', folderName);
    
    if (fs.existsSync(fullPath)) {
      const now = new Date().toISOString();
      merged.set(model.id, normalizeModelMetadata({
        id: model.id,
        name: model.label,
        provider: model.family as any || 'custom',
        runtime: model.runtime as any || 'unknown',
        capabilities: model.capabilities as any[],
        status: 'available',
        source: 'registry',
        localPath: normalizeLocalModelPath(fullPath),
        lastCheckedAt: now,
        updatedAt: now,
        description: model.description,
      }));
    }
  }

  return Array.from(merged.values());
}
