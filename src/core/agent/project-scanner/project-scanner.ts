import * as fs from "fs";
import * as path from "path";
import type {
  ProjectDirectoryEntry,
  ProjectFileEntry,
  ProjectScanRequest,
  ProjectScanResult,
  ProjectScanWarning,
  SuspectedProjectType,
} from "./project-scanner-types";

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_FILES = 700;
const DEFAULT_MAX_FILE_BYTES = 64 * 1024;

export const CODE_AGENT_IGNORED_DIRECTORIES = [
  "node_modules",
  ".next",
  "dist",
  "dist-cjs",
  "build",
  "coverage",
  ".git",
  ".turbo",
  ".cache",
  "out",
  "target",
  "vendor",
  "logs",
];

const SAFE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".prisma",
  ".toml",
  ".yaml",
  ".yml",
];

const SENSITIVE_FILE_PATTERNS = [
  /^\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /secret/i,
  /token/i,
  /credential/i,
  /^service-account.*\.json$/i,
];

function relative(rootPath: string, targetPath: string): string {
  return path.relative(rootPath, targetPath).split(path.sep).join("/");
}

export function isPathInsideProjectRoot(rootPath: string, targetPath: string): boolean {
  const rel = path.relative(rootPath, targetPath);
  return rel === "" || (Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel));
}

export function isSensitiveCodeAgentPath(filePath: string): boolean {
  const base = path.basename(filePath);
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(base));
}

function shouldIgnoreDirectory(name: string): boolean {
  return CODE_AGENT_IGNORED_DIRECTORIES.includes(name);
}

function isSafeExtension(filePath: string): boolean {
  return SAFE_EXTENSIONS.includes(path.extname(filePath).toLocaleLowerCase("en-US"));
}

function sanitizeRoot(rootPath: string): string {
  return path.basename(rootPath) || "<workspace>";
}

function detectProjectType(rootPath: string, files: ProjectFileEntry[]): SuspectedProjectType {
  const names = new Set(files.map((file) => file.relativePath));
  if (names.has("src-tauri/tauri.conf.json") || fs.existsSync(path.join(rootPath, "src-tauri"))) return "tauri";
  if (names.has("Cargo.toml")) return "rust";
  if (names.has("next.config.js") || names.has("next.config.mjs") || names.has("next.config.ts") || fs.existsSync(path.join(rootPath, "next.config.ts"))) return "next";
  if (names.has("app.json") && files.some((file) => file.relativePath.includes("react-native"))) return "react-native";
  if (names.has("package.json")) return "node";
  return "unknown";
}

function readPackageScripts(rootPath: string): string[] | undefined {
  const packagePath = path.join(rootPath, "package.json");
  if (!fs.existsSync(packagePath)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || !parsed.scripts || typeof parsed.scripts !== "object") return undefined;
    return Object.keys(parsed.scripts).sort();
  } catch {
    return undefined;
  }
}

function makeFileEntry(params: {
  rootPath: string;
  fullPath: string;
  sizeBytes: number;
  maxFileBytes: number;
  includeContentPreview: boolean;
}): ProjectFileEntry {
  const rel = relative(params.rootPath, params.fullPath);
  const extension = path.extname(params.fullPath).toLocaleLowerCase("en-US");
  const sensitive = isSensitiveCodeAgentPath(params.fullPath);
  const safeExtension = isSafeExtension(params.fullPath);
  const tooLarge = params.sizeBytes > params.maxFileBytes;
  const skipped = sensitive || !safeExtension || tooLarge;
  const skipReason = sensitive ? "SENSITIVE_FILE_CONTENT_NOT_READ" : !safeExtension ? "UNSUPPORTED_EXTENSION" : tooLarge ? "FILE_TOO_LARGE_METADATA_ONLY" : undefined;
  let preview: string | undefined;
  let contentRead = false;

  if (!skipped && params.includeContentPreview) {
    try {
      preview = fs.readFileSync(params.fullPath, "utf8").slice(0, 500);
      contentRead = true;
    } catch {
      preview = undefined;
    }
  }

  return {
    relativePath: rel,
    extension,
    sizeBytes: params.sizeBytes,
    summarySafe: !sensitive && safeExtension,
    contentRead,
    skipped,
    skipReason,
    preview,
  };
}

export function scanProjectSafe(input: ProjectScanRequest): ProjectScanResult {
  const rootPath = path.resolve(input.rootPath);
  const maxDepth = input.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxFiles = input.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileBytes = input.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const includeContentPreview = input.includeContentPreview === true;
  const warnings: ProjectScanWarning[] = [];
  const includedFiles: ProjectFileEntry[] = [];
  const skippedFiles: ProjectFileEntry[] = [];
  const directories: ProjectDirectoryEntry[] = [];
  let totalDirectories = 0;
  let totalFiles = 0;

  if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    return {
      success: false,
      rootPath: input.sanitizePaths ? sanitizeRoot(rootPath) : rootPath,
      totalFiles: 0,
      totalDirectories: 0,
      includedFiles: [],
      skippedFiles: [],
      directories: [],
      warnings: [{ code: "INVALID_ROOT", message: "Project root does not exist or is not a directory." }],
      diagnostics: {
        rootPath,
        sanitizedRootPath: sanitizeRoot(rootPath),
        maxDepth,
        maxFiles,
        maxFileBytes,
        ignoredDirectoryNames: CODE_AGENT_IGNORED_DIRECTORIES,
        safeExtensions: SAFE_EXTENSIONS,
        pathTraversalGuard: true,
      },
      suspectedProjectType: "unknown",
    };
  }

  function visit(dir: string, depth: number): void {
    if (depth > maxDepth || totalFiles >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      warnings.push({ code: "READ_DIRECTORY_FAILED", message: "Directory could not be read.", path: relative(rootPath, dir) });
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (!isPathInsideProjectRoot(rootPath, fullPath)) {
        warnings.push({ code: "PATH_OUTSIDE_ROOT_SKIPPED", message: "Path traversal guard blocked an entry.", path: entry.name });
        continue;
      }

      if (entry.isDirectory()) {
        totalDirectories += 1;
        const rel = relative(rootPath, fullPath);
        if (shouldIgnoreDirectory(entry.name)) {
          directories.push({ relativePath: rel, skipped: true, skipReason: "IGNORED_DIRECTORY" });
          continue;
        }
        directories.push({ relativePath: rel, skipped: false });
        visit(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      totalFiles += 1;
      if (totalFiles > maxFiles) {
        warnings.push({ code: "MAX_FILES_REACHED", message: "Project scan stopped at maxFiles limit." });
        return;
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        warnings.push({ code: "STAT_FAILED", message: "File stat failed.", path: relative(rootPath, fullPath) });
        continue;
      }

      const file = makeFileEntry({ rootPath, fullPath, sizeBytes: stat.size, maxFileBytes, includeContentPreview });
      if (file.skipped) skippedFiles.push(file);
      else includedFiles.push(file);
    }
  }

  visit(rootPath, 1);

  const allFiles = [...includedFiles, ...skippedFiles].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const publicRoot = input.sanitizePaths ? sanitizeRoot(rootPath) : rootPath;

  return {
    success: true,
    rootPath: publicRoot,
    totalFiles,
    totalDirectories,
    includedFiles: includedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    skippedFiles: skippedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    directories: directories.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    warnings,
    diagnostics: {
      rootPath,
      sanitizedRootPath: sanitizeRoot(rootPath),
      maxDepth,
      maxFiles,
      maxFileBytes,
      ignoredDirectoryNames: CODE_AGENT_IGNORED_DIRECTORIES,
      safeExtensions: SAFE_EXTENSIONS,
      pathTraversalGuard: true,
    },
    suspectedProjectType: detectProjectType(rootPath, allFiles),
    packageScripts: readPackageScripts(rootPath),
  };
}
