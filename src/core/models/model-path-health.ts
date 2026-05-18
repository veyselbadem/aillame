import fs from 'fs';
import path from 'path';

export type ModelPathStatus =
  | 'ready'
  | 'missing'
  | 'warning'
  | 'optional_missing'
  | 'legacy_absent';

export type ModelPathRequirement = 'required' | 'optional' | 'legacy';

export type ModelPathCheck = {
  label: string;
  path: string;
  exists: boolean;
  signature?: 'GGUF' | 'UNKNOWN' | null;
  sizeBytes: number;
  type: 'file' | 'directory';
  error?: string;
};

export type ModelPathHealthDetail = {
  id: string;
  name: string;
  role: string;
  required: boolean;
  requirement: ModelPathRequirement;
  status: ModelPathStatus;
  paths: ModelPathCheck[];
  note?: string;
};

export type ModelPathHealthSummary = {
  ready: number;
  missing: number;
  warning: number;
  optionalMissing: number;
  legacyAbsent: number;
};

export type ModelPathHealthReport = {
  ok: boolean;
  generatedAt: string;
  checkedAt: string;
  readOnly: true;
  models: ModelPathHealthDetail[];
  summary: ModelPathHealthSummary;
  message: string;
};

export const MODEL_PATHS = {
  qwenModel: 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\model.gguf',
  qwenMmproj: 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\mmproj.gguf',
  sdxlDiffusers: 'C:\\aillame-models\\diffusion\\sdxl-turbo-1.0',
  sdxlSafetensors: 'C:\\aillame-models\\diffusion\\sd_xl_turbo_1.0_fp16.safetensors',
  tinySdLegacy: 'C:\\aillame-models\\diffusion\\tiny-sd',
} as const;

function getProjectPath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function getDirectorySizeBytes(directoryPath: string) {
  let total = 0;
  const stack = [directoryPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      try {
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile()) {
          total += fs.statSync(fullPath).size;
        }
      } catch {
        // Keep the health endpoint best-effort and read-only.
      }
    }
  }

  return total;
}

function readGgufSignature(filePath: string): 'GGUF' | 'UNKNOWN' {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    return buffer.toString('utf8') === 'GGUF' ? 'GGUF' : 'UNKNOWN';
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

export function checkModelPath(
  label: string,
  targetPath: string,
  options: { checkGgufSignature?: boolean; expectedType?: 'file' | 'directory' } = {},
): ModelPathCheck {
  try {
    if (!fs.existsSync(targetPath)) {
      return {
        label,
        path: targetPath,
        exists: false,
        signature: options.checkGgufSignature ? null : undefined,
        sizeBytes: 0,
        type: options.expectedType ?? 'file',
      };
    }

    const stat = fs.statSync(targetPath);
    const type = stat.isDirectory() ? 'directory' : 'file';
    const sizeBytes = type === 'directory' ? getDirectorySizeBytes(targetPath) : stat.size;
    const signature = options.checkGgufSignature && type === 'file'
      ? readGgufSignature(targetPath)
      : undefined;

    return {
      label,
      path: targetPath,
      exists: true,
      signature,
      sizeBytes,
      type,
      error: options.expectedType && options.expectedType !== type
        ? `Beklenen tür ${options.expectedType}, bulunan tür ${type}.`
        : undefined,
    };
  } catch (error) {
    return {
      label,
      path: targetPath,
      exists: false,
      signature: options.checkGgufSignature ? null : undefined,
      sizeBytes: 0,
      type: options.expectedType ?? 'file',
      error: error instanceof Error ? error.message : 'Yol kontrol edilemedi.',
    };
  }
}

function requiredStatus(paths: ModelPathCheck[]) {
  if (paths.some((item) => !item.exists)) return 'missing';
  if (paths.some((item) => item.error || item.signature === 'UNKNOWN')) return 'warning';
  return 'ready';
}

function optionalStatus(paths: ModelPathCheck[]) {
  if (paths.some((item) => item.exists && (item.error || item.signature === 'UNKNOWN'))) return 'warning';
  if (paths.some((item) => item.exists)) return 'ready';
  return 'optional_missing';
}

function legacyStatus(paths: ModelPathCheck[]) {
  if (paths.some((item) => item.exists)) return 'warning';
  return 'legacy_absent';
}

export function getModelPathHealth(): ModelPathHealthReport {
  const checkedAt = new Date().toISOString();
  const qwenPaths = [
    checkModelPath('Model GGUF', MODEL_PATHS.qwenModel, { checkGgufSignature: true, expectedType: 'file' }),
    checkModelPath('MMProj GGUF', MODEL_PATHS.qwenMmproj, { checkGgufSignature: true, expectedType: 'file' }),
  ];

  const sdxlPaths = [
    checkModelPath('SDXL Turbo Diffusers Klasörü', MODEL_PATHS.sdxlDiffusers, { expectedType: 'directory' }),
    checkModelPath('SDXL Turbo Tek Dosya', MODEL_PATHS.sdxlSafetensors, { expectedType: 'file' }),
  ];

  const nanoPaths = [
    checkModelPath('Aillame Nano Public Model', getProjectPath('public', 'model', 'aillame-v1'), { expectedType: 'directory' }),
    checkModelPath('Aillame Nano Checkpoints', getProjectPath('src', 'core', 'engine', 'checkpoints'), { expectedType: 'directory' }),
  ];

  const tinySdPaths = [
    checkModelPath('Tiny SD Legacy Klasörü', MODEL_PATHS.tinySdLegacy, { expectedType: 'directory' }),
  ];

  const models: ModelPathHealthDetail[] = [
    {
      id: 'qwen3-vl-4b-instruct-q4-k-m',
      name: 'Qwen3-VL 4B Nano Vision',
      role: 'Görsel anlama ve multimodal sohbet',
      required: true,
      requirement: 'required',
      status: requiredStatus(qwenPaths),
      paths: qwenPaths,
    },
    {
      id: 'sdxl-turbo-1.0',
      name: 'SDXL Turbo',
      role: 'Ana görsel üretim modeli',
      required: true,
      requirement: 'required',
      status: requiredStatus(sdxlPaths),
      paths: sdxlPaths,
    },
    {
      id: 'aillame-nano-v1',
      name: 'Aillame Nano',
      role: 'Yerel çekirdek, metin sohbeti ve görev yönlendirme',
      required: true,
      requirement: 'required',
      status: requiredStatus(nanoPaths),
      paths: nanoPaths,
    },
    {
      id: 'tiny-sd',
      name: 'Tiny SD',
      role: 'Legacy / opsiyonel test modeli',
      required: false,
      requirement: 'legacy',
      status: legacyStatus(tinySdPaths),
      paths: tinySdPaths,
      note: 'Tiny SD artık aktif/korunan model değildir. Eksik olması hata değildir.',
    },
  ];

  const summary: ModelPathHealthSummary = {
    ready: 0,
    missing: 0,
    warning: 0,
    optionalMissing: 0,
    legacyAbsent: 0,
  };

  for (const model of models) {
    if (model.status === 'ready') summary.ready += 1;
    if (model.status === 'missing') summary.missing += 1;
    if (model.status === 'warning') summary.warning += 1;
    if (model.status === 'optional_missing') summary.optionalMissing += 1;
    if (model.status === 'legacy_absent') summary.legacyAbsent += 1;
  }

  return {
    ok: !models.some((model) => model.required && (model.status === 'missing' || model.status === 'warning')),
    generatedAt: checkedAt,
    checkedAt,
    readOnly: true,
    models,
    summary,
    message: 'Model yolu doğrulama yalnızca yerel dosya varlığını, boyutu ve GGUF imzasını kontrol eder; dosya indirmez, silmez veya taşımaz.',
  };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const fractionDigits = unitIndex >= 3 ? 3 : value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}
