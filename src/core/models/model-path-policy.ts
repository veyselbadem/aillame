import path from "path";
import { getStorageRoot } from "../storage/file-store";

/**
 * Returns the central directory for GGUF model files.
 * Priority:
 * 1. AILLAME_GGUF_MODEL_DIR
 * 2. AILLAME_MODEL_LIBRARY_DIR (Faz 3 legacy)
 * 3. storage/models/gguf
 */
export function getGgufModelDirectory(): string {
  const dir = process.env.AILLAME_GGUF_MODEL_DIR 
    || process.env.AILLAME_MODEL_LIBRARY_DIR;
    
  if (dir && dir.trim()) {
    return path.resolve(process.cwd(), dir.trim());
  }
  
  return path.join(getStorageRoot(), "models", "gguf");
}

export function isGgufFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".gguf");
}

export function getSafeFileName(fileName: string): string {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}
