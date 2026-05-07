import * as fs from "fs";
import * as path from "path";

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "node_modules",
  "dist",
  "dist-cjs",
  "build",
  "coverage",
  "target",
  "__pycache__",
]);

const SENSITIVE_FILE_PATTERNS = [
  /^\.env($|\.)/i,
  /secret/i,
  /credential/i,
  /private[-_]?key/i,
  /\.pem$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /id_rsa/i,
];

export type WorkspaceSafetyCheck = {
  ok: boolean;
  rootPath: string;
  warnings: string[];
  errors: string[];
};

export function resolveWorkspaceRoot(rootPath: string): WorkspaceSafetyCheck {
  const resolved = path.resolve(rootPath);
  const errors: string[] = [];

  if (!fs.existsSync(resolved)) {
    errors.push(`Workspace root does not exist: ${resolved}`);
  } else if (!fs.statSync(resolved).isDirectory()) {
    errors.push(`Workspace root is not a directory: ${resolved}`);
  }

  return {
    ok: errors.length === 0,
    rootPath: resolved,
    warnings: [],
    errors,
  };
}

export function isPathInsideRoot(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function shouldSkipDirectory(name: string, includeHidden: boolean): boolean {
  if (DEFAULT_IGNORED_DIRECTORIES.has(name)) return true;
  return !includeHidden && name.startsWith(".");
}

export function isSensitiveFileName(name: string): boolean {
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

export function shouldSkipFile(name: string, includeHidden: boolean): boolean {
  if (!includeHidden && name.startsWith(".")) return true;
  return isSensitiveFileName(name);
}
