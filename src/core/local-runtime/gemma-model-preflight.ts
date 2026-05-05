import fs from 'fs';
import path from 'path';
import { listLocalModels } from '@core/model-library';
import { normalizeLocalModelPath } from '@core/model-library/paths';

export interface GemmaModelPreflightRequest {
  modelId?: string;
  localPath?: string;
  dryRun: true;
  expectedRuntime?: string;
}

export interface GemmaModelPreflightChecks {
  pathAllowed: boolean;
  exists: boolean;
  isFile: boolean;
  extensionAllowed: boolean;
  headerLooksLikeGguf?: boolean;
  sizeWithinLimit: boolean;
  noRuntimeSwitch: true;
}

export interface GemmaModelPreflightResult {
  ok: boolean;
  dryRun: true;
  modelId?: string;
  localPath?: string;
  fileName?: string;
  sizeBytes?: number;
  reason?: string;
  checks: GemmaModelPreflightChecks;
}

const GGUF_MAGIC = Buffer.from('GGUF', 'utf8');
const MIN_GGUF_SIZE_BYTES = 16;
const DEFAULT_MAX_SIZE_BYTES = Number(process.env.AILLAME_GEMMA_PREFLIGHT_MAX_SIZE_BYTES || 0);

export function getAllowedGemmaModelRoots(): string[] {
  const roots = [
    process.env.AILLAME_MODEL_LIBRARY_DIR,
    process.env.AILLAME_MODEL_LIBRARY_ROOT,
    process.env.AILLAME_GEMMA_MODELS_DIR,
    normalizeLocalModelPath(path.join(process.cwd(), 'runtime', 'models')),
    normalizeLocalModelPath(path.join(process.cwd(), 'models')),
    normalizeLocalModelPath(path.join(process.cwd(), 'local-models')),
  ]
    .map((value) => normalizeLocalModelPath(value || ''))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);

  return roots;
}

export function isPathInsideAllowedRoots(filePath: string, roots: string[]): boolean {
  const target = normalizeLocalModelPath(path.resolve(filePath));
  if (!target) return false;

  return roots.some((root) => {
    const normalizedRoot = normalizeLocalModelPath(path.resolve(root));
    if (!normalizedRoot) return false;
    return target === normalizedRoot || target.startsWith(`${normalizedRoot}${path.sep}`);
  });
}

export function readGgufMagicBytes(filePath: string): boolean | undefined {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    try {
      const bytesRead = fs.readSync(fd, buffer, 0, 4, 0);
      if (bytesRead < 4) return false;
      return buffer.equals(GGUF_MAGIC);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return undefined;
  }
}

function sanitizeReportedPath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  const normalized = normalizeLocalModelPath(filePath);
  return normalized || undefined;
}

function resolveLocalPath(request: GemmaModelPreflightRequest): { modelId?: string; localPath?: string } {
  if (request.localPath) {
    return {
      modelId: request.modelId,
      localPath: normalizeLocalModelPath(request.localPath),
    };
  }

  if (!request.modelId) {
    return {};
  }

  try {
    const match = listLocalModels().find((model) => model.id === request.modelId);
    return {
      modelId: request.modelId,
      localPath: match?.localPath ? normalizeLocalModelPath(match.localPath) : undefined,
    };
  } catch {
    return { modelId: request.modelId };
  }
}

export function validateGemmaModelPath(input: GemmaModelPreflightRequest): GemmaModelPreflightResult {
  const resolved = resolveLocalPath(input);
  const roots = getAllowedGemmaModelRoots();
  const filePath = resolved.localPath;
  const checks: GemmaModelPreflightChecks = {
    pathAllowed: false,
    exists: false,
    isFile: false,
    extensionAllowed: false,
    headerLooksLikeGguf: undefined,
    sizeWithinLimit: true,
    noRuntimeSwitch: true,
  };

  if (!filePath) {
    return {
      ok: false,
      dryRun: true,
      modelId: resolved.modelId,
      reason: 'Gemma model yolu çözümlenemedi.',
      checks,
    };
  }

  checks.pathAllowed = isPathInsideAllowedRoots(filePath, roots);
  checks.extensionAllowed = filePath.toLowerCase().endsWith('.gguf');

  let stats: fs.Stats | undefined;
  try {
    stats = fs.statSync(filePath);
    checks.exists = true;
    checks.isFile = stats.isFile();
  } catch {
    stats = undefined;
  }

  const sizeBytes = stats?.size;
  if (typeof sizeBytes === 'number') {
    checks.sizeWithinLimit = sizeBytes >= MIN_GGUF_SIZE_BYTES
      && (DEFAULT_MAX_SIZE_BYTES <= 0 || sizeBytes <= DEFAULT_MAX_SIZE_BYTES);
  } else {
    checks.sizeWithinLimit = false;
  }

  if (checks.exists && checks.isFile && checks.extensionAllowed) {
    checks.headerLooksLikeGguf = readGgufMagicBytes(filePath);
  }

  const ok = checks.pathAllowed
    && checks.exists
    && checks.isFile
    && checks.extensionAllowed
    && checks.headerLooksLikeGguf === true
    && checks.sizeWithinLimit;

  let reason = 'Gemma GGUF preflight doğrulandı.';
  if (!checks.pathAllowed) reason = 'Model yolu allowlist dışında.';
  else if (!checks.exists) reason = 'Model dosyası bulunamadı.';
  else if (!checks.isFile) reason = 'Belirtilen yol dosya değil.';
  else if (!checks.extensionAllowed) reason = 'Sadece .gguf uzantılı model dosyaları kabul edilir.';
  else if (checks.headerLooksLikeGguf !== true) reason = 'GGUF başlığı doğrulanamadı.';
  else if (!checks.sizeWithinLimit) reason = 'GGUF dosya boyutu geçersiz veya çok küçük.';

  return {
    ok,
    dryRun: true,
    modelId: resolved.modelId,
    localPath: sanitizeReportedPath(filePath),
    fileName: filePath ? path.basename(filePath) : undefined,
    sizeBytes,
    reason,
    checks,
  };
}

export function preflightGemmaModelSwitch(
  request: GemmaModelPreflightRequest,
): GemmaModelPreflightResult {
  return validateGemmaModelPath(request);
}