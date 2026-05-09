import path from 'path';
import type { ModelRuntimeKind } from './types';

const MODEL_FILE_EXTENSIONS = ['.gguf', '.safetensors', '.onnx', '.bin', '.pt', '.pth', '.ckpt'];

export function getDefaultModelLibraryRoot(): string {
  const configured = process.env.AILLAME_MODEL_LIBRARY_ROOT?.trim();
  if (configured) return normalizeLocalModelPath(configured);
  return normalizeLocalModelPath(path.join(process.cwd(), 'models'));
}

export function normalizeLocalModelPath(input: string): string {
  const normalized = path.normalize((input || '').trim());
  if (!normalized) return '';
  return normalized.replace(/[\\/]+$/, '');
}

export function isProbablyModelFile(fileName: string): boolean {
  const ext = path.extname((fileName || '').toLowerCase());
  return MODEL_FILE_EXTENSIONS.includes(ext);
}

export function getModelFileRuntimeKind(fileName: string): ModelRuntimeKind {
  const ext = path.extname((fileName || '').toLowerCase());
  switch (ext) {
    case '.gguf':
      return 'gguf';
    case '.safetensors':
      return 'safetensors';
    case '.pt':
    case '.pth':
    case '.ckpt':
      return 'diffusers';
    case '.onnx':
    case '.bin':
      return 'unknown';
    default:
      return 'unknown';
  }
}

export function getAllowedModelRoots(): string[] {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const roots = [
    process.env.AILLAME_MODEL_LIBRARY_DIR,
    process.env.AILLAME_MODEL_LIBRARY_ROOT,
    process.env.AILLAME_GEMMA_MODELS_DIR,
    normalizeLocalModelPath(path.join(process.cwd(), 'models')),
    normalizeLocalModelPath(path.join(process.cwd(), 'public', 'model')),
    normalizeLocalModelPath(path.join(process.cwd(), 'runtime', 'models')),
    normalizeLocalModelPath(path.join(process.cwd(), 'runtime', 'checkpoints')),
    normalizeLocalModelPath(path.join(process.cwd(), 'local-models')),
    normalizeLocalModelPath(path.join(homeDir, '.cache', 'huggingface', 'hub')),
  ]
    .map((value) => normalizeLocalModelPath(value || ''))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);

  return roots;
}

export function isPathInsideAllowedRoots(filePath: string): boolean {
  const target = normalizeLocalModelPath(path.resolve(filePath));
  if (!target) return false;

  const roots = getAllowedModelRoots();
  return roots.some((root) => {
    const normalizedRoot = normalizeLocalModelPath(path.resolve(root));
    if (!normalizedRoot) return false;
    // Check if target is exactly the root or inside it
    return target === normalizedRoot || target.startsWith(`${normalizedRoot}${path.sep}`);
  });
}

export function sanitizeModelId(input: string): string {
  return (input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
