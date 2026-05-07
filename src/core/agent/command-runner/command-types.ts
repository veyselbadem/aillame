export type AillameCommandRiskLevel =
  | "safe"
  | "review-required"
  | "dangerous"
  | "blocked";

export type AillameCommandCategory =
  | "typecheck"
  | "test"
  | "build"
  | "lint"
  | "dev-server"
  | "install"
  | "package-manager"
  | "git"
  | "file-system"
  | "process"
  | "network"
  | "database"
  | "unknown";

export type AillameCommandSafetyInput = {
  command: string;
  rootPath?: string;
  projectType?: string;
  projectId?: string;
  allowNetwork?: boolean;
  allowInstall?: boolean;
  allowProcessKill?: boolean;
  allowFileDelete?: boolean;
  metadata?: Record<string, unknown>;
};

export type AillameCommandSafetyResult = {
  allowed: boolean;
  risk: AillameCommandRiskLevel;
  category: AillameCommandCategory;
  normalizedCommand: string;
  reason: string;
  requiresUserApproval: boolean;
  warnings: string[];
  blockedReasons: string[];
  suggestedSaferAlternative?: string;
  dryRunOnly: true;
};

export type AillameCommandPlanResult = {
  success: boolean;
  mode: "dry-run-plan";
  command: string;
  safety: AillameCommandSafetyResult;
  plan: string[];
  readOnly: true;
  willExecute: false;
};
