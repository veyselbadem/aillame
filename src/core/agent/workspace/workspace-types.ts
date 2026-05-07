export type AillameWorkspaceScanInput = {
  rootPath: string;
  projectId?: string;
  maxDepth?: number;
  maxFiles?: number;
  includeHidden?: boolean;
};

export type AillameWorkspaceFileInfo = {
  path: string;
  relativePath: string;
  name: string;
  extension?: string;
  sizeBytes: number;
  isDirectory: boolean;
  isImportant: boolean;
  reason?: string;
};

export type AillameWorkspaceProjectType =
  | "node"
  | "nextjs"
  | "vite"
  | "react-native"
  | "electron"
  | "tauri"
  | "rust"
  | "python"
  | "wordpress-plugin"
  | "unknown";

export type AillameWorkspaceScanResult = {
  success: boolean;
  rootPath: string;
  projectType: AillameWorkspaceProjectType;
  files: AillameWorkspaceFileInfo[];
  importantFiles: AillameWorkspaceFileInfo[];
  detected: {
    packageJson?: boolean;
    tsconfig?: boolean;
    nextConfig?: boolean;
    viteConfig?: boolean;
    prismaSchema?: boolean;
    cargoToml?: boolean;
    tauriConfig?: boolean;
    envFiles?: string[];
    readme?: boolean;
  };
  warnings: string[];
  errors: string[];
};

export type AillameWorkspaceAnalysisReport = {
  success: boolean;
  projectType: AillameWorkspaceProjectType;
  summary: string;
  detectedStack: string[];
  importantFiles: string[];
  possibleIssues: string[];
  recommendedNextChecks: string[];
  safety: {
    readOnly: true;
    rootRestricted: boolean;
    skippedSensitiveFiles: string[];
  };
};
