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

export function sanitizeModelId(input: string): string {
  return (input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
