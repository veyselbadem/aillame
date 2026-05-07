import fs from 'fs';
import path from 'path';
import { StorageDiagnostics } from './storage-policy';

export function getStorageRoot(): string {
  const envDir = process.env.AILLAME_DATA_DIR;
  if (envDir) {
    return path.resolve(process.cwd(), envDir);
  }
  return path.join(process.cwd(), '.aillame-data');
}

export function ensureStorageRoot(): StorageDiagnostics {
  const rootPath = getStorageRoot();
  const diagnostics: StorageDiagnostics = {
    rootPath,
    isAvailable: false,
    isWritable: false,
    warnings: [],
  };

  try {
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath, { recursive: true });
    }
    diagnostics.isAvailable = true;

    // check if it's within project, to warn if external
    if (!rootPath.startsWith(process.cwd())) {
      diagnostics.warnings.push('Storage root is outside the project directory.');
    }

    // check writable
    const testFile = path.join(rootPath, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    diagnostics.isWritable = true;
  } catch (err) {
    diagnostics.warnings.push(`Failed to access storage root: ${err instanceof Error ? err.message : String(err)}`);
  }

  return diagnostics;
}

export function resolveStoragePath(filename: string): string {
  const root = getStorageRoot();
  return path.join(root, filename);
}

export function appendJsonl<T>(filename: string, data: T): void {
  const rootDiag = ensureStorageRoot();
  if (!rootDiag.isWritable) {
    throw new Error(`Storage root is not writable: ${rootDiag.rootPath}`);
  }
  const filePath = resolveStoragePath(filename);
  const jsonStr = JSON.stringify(data);
  fs.appendFileSync(filePath, jsonStr + '\n', 'utf8');
}

export function readJsonl<T>(filename: string): { lines: T[]; warnings: string[] } {
  const filePath = resolveStoragePath(filename);
  const result: { lines: T[]; warnings: string[] } = { lines: [], warnings: [] };

  if (!fs.existsSync(filePath)) {
    return result;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rawLines = content.split('\n').filter((l) => l.trim().length > 0);

  rawLines.forEach((lineStr, index) => {
    try {
      result.lines.push(JSON.parse(lineStr));
    } catch (err) {
      result.warnings.push(`Failed to parse line ${index + 1} in ${filename}`);
    }
  });

  return result;
}

export function writeJsonl<T>(filename: string, lines: T[]): void {
  const rootDiag = ensureStorageRoot();
  if (!rootDiag.isWritable) {
    throw new Error(`Storage root is not writable: ${rootDiag.rootPath}`);
  }
  const filePath = resolveStoragePath(filename);
  const content = lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length > 0 ? '\n' : '');
  fs.writeFileSync(filePath, content, 'utf8');
}

export function getFileDiagnostics(filename: string): { exists: boolean; sizeBytes: number; lines: number; lastWriteAt?: number } {
  const filePath = resolveStoragePath(filename);
  if (!fs.existsSync(filePath)) {
    return { exists: false, sizeBytes: 0, lines: 0 };
  }
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0).length;
  
  return {
    exists: true,
    sizeBytes: stat.size,
    lines,
    lastWriteAt: stat.mtimeMs,
  };
}
