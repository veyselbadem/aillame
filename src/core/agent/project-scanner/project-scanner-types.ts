export type SuspectedProjectType = "next" | "node" | "react-native" | "tauri" | "rust" | "unknown";

export type ProjectScanRequest = {
  rootPath: string;
  maxDepth?: number;
  maxFiles?: number;
  maxFileBytes?: number;
  includeContentPreview?: boolean;
  sanitizePaths?: boolean;
};

export type ProjectFileEntry = {
  relativePath: string;
  extension: string;
  sizeBytes: number;
  summarySafe: boolean;
  contentRead: boolean;
  skipped: boolean;
  skipReason?: string;
  preview?: string;
};

export type ProjectDirectoryEntry = {
  relativePath: string;
  skipped: boolean;
  skipReason?: string;
};

export type ProjectScanWarning = {
  code: string;
  message: string;
  path?: string;
};

export type ProjectScanDiagnostics = {
  rootPath: string;
  sanitizedRootPath: string;
  maxDepth: number;
  maxFiles: number;
  maxFileBytes: number;
  ignoredDirectoryNames: string[];
  safeExtensions: string[];
  pathTraversalGuard: boolean;
};

export type ProjectScanResult = {
  success: boolean;
  rootPath: string;
  totalFiles: number;
  totalDirectories: number;
  includedFiles: ProjectFileEntry[];
  skippedFiles: ProjectFileEntry[];
  directories: ProjectDirectoryEntry[];
  warnings: ProjectScanWarning[];
  diagnostics: ProjectScanDiagnostics;
  suspectedProjectType: SuspectedProjectType;
  packageScripts?: string[];
};
