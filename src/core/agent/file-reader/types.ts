export type AgentFileReadRequest = {
  workspacePath: string;
  relativePaths: string[];
  maxBytesPerFile?: number;
  maxFiles?: number;
};

export type AgentFileSummary = {
  relativePath: string;
  extension: string;
  sizeBytes: number;
  truncated: boolean;
  redacted: boolean;
  language: string;
  purpose: string;
  structure: {
    imports: string[];
    exports: string[];
    functions: string[];
    classes: string[];
    components: string[];
    routes: string[];
    scripts: string[];
  };
  contentPreview: string;
  warnings: string[];
};

export type DeepContextPackage = {
  success: true;
  mode: "read-only-deep-context";
  workspace: {
    safeRootName: string;
    projectType: string;
    detectedFrameworks: string[];
    detectedLanguages: string[];
  };
  task: {
    original: string;
    sanitized: string;
    category: string;
  };
  selectedFiles: AgentFileSummary[];
  skippedFiles: Array<{
    relativePath: string;
    reason: string;
  }>;
  safety: {
    readOnly: true;
    willModifyFiles: false;
    willRunCommands: false;
    secretsRedacted: boolean;
    blockedSensitiveFiles: string[];
    warnings: string[];
  };
  analysisHints: string[];
};
