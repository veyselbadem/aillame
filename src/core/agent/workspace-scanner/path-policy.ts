import path from "path";
import fs from "fs";

export function resolveContainedWorkspaceRoot(workspacePath: string): string | null {
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

export function resolveContainedExistingPath(workspacePath: string, relativePath: string): string | null {
  if (!relativePath || relativePath.includes("\0")) return null;
  if (path.isAbsolute(relativePath) || /^[a-zA-Z]:[\\/]/.test(relativePath)) return null;

  const workspaceRoot = resolveContainedWorkspaceRoot(workspacePath);
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
