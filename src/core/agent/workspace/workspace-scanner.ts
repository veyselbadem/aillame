import * as fs from "fs";
import * as path from "path";
import { buildDetectedFlags, classifyWorkspaceFile, detectWorkspaceProjectType } from "./workspace-detector";
import {
  isPathInsideRoot,
  isSensitiveFileName,
  resolveWorkspaceRoot,
  shouldSkipDirectory,
  shouldSkipFile,
} from "./workspace-safety";
import type {
  AillameWorkspaceFileInfo,
  AillameWorkspaceScanInput,
  AillameWorkspaceScanResult,
} from "./workspace-types";

const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MAX_FILES = 500;

function normalizeRelative(rootPath: string, filePath: string): string {
  const relative = path.relative(rootPath, filePath);
  return relative.split(path.sep).join("/");
}

function sortFiles(files: AillameWorkspaceFileInfo[]): AillameWorkspaceFileInfo[] {
  return files.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.relativePath.localeCompare(b.relativePath);
  });
}

export function scanWorkspaceReadOnly(input: AillameWorkspaceScanInput): AillameWorkspaceScanResult {
  const root = resolveWorkspaceRoot(input.rootPath);
  const maxDepth = input.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxFiles = input.maxFiles ?? DEFAULT_MAX_FILES;
  const includeHidden = input.includeHidden ?? false;
  const files: AillameWorkspaceFileInfo[] = [];
  const warnings = [...root.warnings];
  const errors = [...root.errors];

  if (!root.ok) {
    return {
      success: false,
      rootPath: root.rootPath,
      projectType: "unknown",
      files: [],
      importantFiles: [],
      detected: {},
      warnings,
      errors,
    };
  }

  function visit(directoryPath: string, depth: number): void {
    if (files.length >= maxFiles) {
      if (!warnings.includes("MAX_FILES_REACHED")) warnings.push("MAX_FILES_REACHED");
      return;
    }

    if (depth > maxDepth) return;

    let entries: string[];
    try {
      entries = fs.readdirSync(directoryPath);
    } catch (error) {
      warnings.push(`READ_FAILED:${normalizeRelative(root.rootPath, directoryPath)}:${error instanceof Error ? error.message : "unknown"}`);
      return;
    }

    for (const entryName of entries) {
      if (files.length >= maxFiles) {
        if (!warnings.includes("MAX_FILES_REACHED")) warnings.push("MAX_FILES_REACHED");
        return;
      }

      const fullPath = path.join(directoryPath, entryName);
      if (!isPathInsideRoot(root.rootPath, fullPath)) {
        warnings.push(`PATH_OUTSIDE_ROOT_SKIPPED:${entryName}`);
        continue;
      }

      let stat: ReturnType<typeof fs.statSync>;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        warnings.push(`STAT_FAILED:${entryName}`);
        continue;
      }

      if (stat.isDirectory()) {
        if (shouldSkipDirectory(entryName, includeHidden)) continue;
        const relativePath = normalizeRelative(root.rootPath, fullPath);
        files.push(classifyWorkspaceFile(fullPath, relativePath, stat.size, true));
        visit(fullPath, depth + 1);
        continue;
      }

      if (!stat.isFile()) continue;
      if (shouldSkipFile(entryName, includeHidden)) {
        if (isSensitiveFileName(entryName)) warnings.push(`SENSITIVE_FILE_SKIPPED:${entryName}`);
        continue;
      }

      const relativePath = normalizeRelative(root.rootPath, fullPath);
      files.push(classifyWorkspaceFile(fullPath, relativePath, stat.size, false));
    }
  }

  visit(root.rootPath, 1);

  const sortedFiles = sortFiles(files);
  const detected = buildDetectedFlags(sortedFiles);
  const importantFiles = sortedFiles.filter((file) => file.isImportant);
  const projectType = detectWorkspaceProjectType(root.rootPath, sortedFiles);

  return {
    success: errors.length === 0,
    rootPath: root.rootPath,
    projectType,
    files: sortedFiles,
    importantFiles,
    detected,
    warnings,
    errors,
  };
}
