export type WorkspaceScanRequest = {
  workspacePath: string;
  maxDepth?: number;
  maxFiles?: number;
  includeExtensions?: string[];
};

export type WorkspaceFileNode = {
  name: string;
  relativePath: string;
  type: "file" | "directory";
  extension?: string;
  sizeBytes?: number;
  children?: WorkspaceFileNode[];
};

export type WorkspaceScanSummary = {
  workspaceRoot: string;
  safeRootName: string;
  projectType: string;
  detectedFrameworks: string[];
  detectedLanguages: string[];
  packageManagers: string[];
  importantFiles: string[];
  ignoredCounts: {
    directories: number;
    files: number;
  };
  fileStats: {
    totalFiles: number;
    totalDirectories: number;
    byExtension: Record<string, number>;
  };
  warnings: string[];
  tree: WorkspaceFileNode[];
};
