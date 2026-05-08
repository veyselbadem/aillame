import path from "path";

export function isSafePath(targetPath: string): boolean {
  if (!targetPath) return false;
  
  // Explicitly block path traversal symbols
  if (targetPath.includes("..")) return false;

  const normalized = path.normalize(targetPath);
  
  // Basic Windows path safety (Drive letter check)
  if (/^[a-zA-Z]:\\/.test(normalized) || /^[a-zA-Z]:\//.test(normalized)) {
    return true;
  }
  
  // Fallback to absolute check
  return path.isAbsolute(normalized);
}

export function maskPath(fullPath: string): string {
  return path.basename(fullPath);
}
