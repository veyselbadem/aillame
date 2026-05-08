import path from "path";
import fs from "fs";

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

export function resolveWorkspaceRoot(workspacePath: string): string | null {
  if (!workspacePath || !path.isAbsolute(workspacePath)) return null;
  if (workspacePath.includes("\0")) return null;

  try {
    const stats = fs.lstatSync(workspacePath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return null;
    return fs.realpathSync(workspacePath);
  } catch {
    return null;
  }
}

export function resolveExistingPathInWorkspace(workspacePath: string, relativePath: string): string | null {
  if (!relativePath || relativePath.includes("\0")) return null;
  if (path.isAbsolute(relativePath) || /^[a-zA-Z]:[\\/]/.test(relativePath)) return null;

  const workspaceRoot = resolveWorkspaceRoot(workspacePath);
  if (!workspaceRoot) return null;

  const normalizedRelative = path.normalize(relativePath);
  if (normalizedRelative === ".." || normalizedRelative.startsWith(`..${path.sep}`) || normalizedRelative.includes(`..${path.sep}`)) {
    return null;
  }

  const candidate = path.resolve(workspaceRoot, normalizedRelative);
  const relativeFromRoot = path.relative(workspaceRoot, candidate);
  if (relativeFromRoot === ".." || relativeFromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeFromRoot)) {
    return null;
  }

  try {
    const stats = fs.lstatSync(candidate);
    if (stats.isSymbolicLink()) return null;
    const realCandidate = fs.realpathSync(candidate);
    const realRelative = path.relative(workspaceRoot, realCandidate);
    if (realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
      return null;
    }
    return realCandidate;
  } catch {
    return null;
  }
}

export function maskPath(fullPath: string): string {
  return path.basename(fullPath);
}
