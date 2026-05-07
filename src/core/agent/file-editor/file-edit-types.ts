export type AillameFileEditRisk =
  | "low"
  | "medium"
  | "high"
  | "blocked";

export type AillameFileEditOperation =
  | "replace-text"
  | "insert-text"
  | "append-text"
  | "create-file"
  | "delete-file"
  | "rename-file"
  | "unknown";

export type AillameFileEditRequest = {
  rootPath: string;
  relativePath: string;
  operation: AillameFileEditOperation;
  description: string;
  beforeText?: string;
  afterText?: string;
  insertText?: string;
  createContent?: string;
  allowCreateFile?: boolean;
  allowDeleteFile?: boolean;
  allowSensitiveFileEdit?: boolean;
  metadata?: Record<string, unknown>;
};

export type AillameFileEditPolicyResult = {
  allowed: boolean;
  risk: AillameFileEditRisk;
  requiresUserApproval: boolean;
  reason: string;
  blockedReasons: string[];
  warnings: string[];
  dryRunOnly: true;
};

export type AillameFileDiffPlan = {
  success: boolean;
  mode: "dry-run";
  rootPath: string;
  relativePath: string;
  operation: AillameFileEditOperation;
  risk: AillameFileEditRisk;
  beforePreview?: string;
  afterPreview?: string;
  diffPreview?: string;
  policy: AillameFileEditPolicyResult;
  backupPlan: {
    required: boolean;
    strategy: "copy-before-write" | "not-needed" | "blocked";
    backupPath?: string;
  };
  rollbackPlan: {
    available: boolean;
    description: string;
  };
  safetyNotes: string[];
};
