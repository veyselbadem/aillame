export interface ProjectFileSummary {
  path: string;
  extension: string;
  sizeBytes: number;
  kind: "scene" | "script" | "asset" | "config" | "unknown";
}

export interface ProjectScanSummary {
  projectPath?: string;
  scanned: boolean;
  files: ProjectFileSummary[];
  ignoredDirectories: string[];
  ignoredFiles: string[];
  warnings: string[];
}

export interface DoomsgamePlanRequest {
  prompt: string;
  projectPath?: string;
  gameType?: string;
  targetPlatform?: string;
  language?: "tr" | "en";
}

export interface DoomsgamePlanResult {
  gameTitle: string;
  concept: string;
  genre: string;
  coreLoop: string;
  mechanics: string[];
  scenes: string[];
  filesToCreate: {
    path: string;
    purpose: string;
    fileType: string;
  }[];
  filesToModify: {
    path: string;
    reason: string;
    safeToModify: boolean;
  }[];
  assetsNeeded: {
    id: string;
    type: "sprite" | "sound" | "music" | "tile" | "ui" | "other";
    description: string;
  }[];
  projectContext: ProjectScanSummary;
  permissionMode: "read_only";
  requiresUserApproval: true;
  safetyNotes: string[];
  nextSteps: string[];
}
