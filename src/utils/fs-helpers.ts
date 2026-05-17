import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';

/**
 * Aillame File System Helpers
 */

export const AILLAME_HOME = path.join(os.homedir(), '.aillame');
export const CATALOG_DIR = path.join(AILLAME_HOME, 'catalog');
export const REGISTRY_DIR = path.join(AILLAME_HOME, 'registry');
export const STATE_DIR = path.join(AILLAME_HOME, 'state');
export const AUDIT_DIR = path.join(AILLAME_HOME, 'audit');

/**
 * Ensures all necessary Aillame directories exist.
 */
export async function ensureAillameDirs() {
  const dirs = [AILLAME_HOME, CATALOG_DIR, REGISTRY_DIR, STATE_DIR, AUDIT_DIR];
  for (const dir of dirs) {
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

/**
 * Appends a line to a file.
 */
export async function appendLine(filePath: string, line: string): Promise<void> {
  const parentDir = path.dirname(filePath);
  if (!fsSync.existsSync(parentDir)) {
    await fs.mkdir(parentDir, { recursive: true });
  }
  await fs.appendFile(filePath, line + '\n', 'utf-8');
}

/**
 * Reads a JSON file safely. Returns null if file does not exist or is invalid.
 */
export async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    if (!fsSync.existsSync(filePath)) return null;
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[FS Helper] Error reading JSON from ${filePath}:`, error);
    return null;
  }
}

/**
 * Writes a JSON file atomically using a temporary file.
 */
export async function writeJsonAtomic<T>(filePath: string, data: T): Promise<boolean> {
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  try {
    const parentDir = path.dirname(filePath);
    if (!fsSync.existsSync(parentDir)) {
      await fs.mkdir(parentDir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`[FS Helper] Error writing JSON to ${filePath}:`, error);
    if (fsSync.existsSync(tempPath)) {
      await fs.unlink(tempPath).catch(() => {});
    }
    return false;
  }
}

/**
 * Checks if a file is a valid GGUF file by reading its magic number.
 * GGUF magic number: 0x47 0x47 0x55 0x46 ('GGUF')
 */
export async function isValidGguf(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(4);
    await fd.read(buffer, 0, 4, 0);
    await fd.close();
    
    return buffer.toString('utf-8') === 'GGUF';
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes Windows paths to use double backslashes consistently or forward slashes.
 */
export function normalizePath(p: string): string {
  return path.normalize(p);
}
