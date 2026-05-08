import { PatchProposal } from "../patch-proposal/types";

export type PatchApplyRequest = {
  workspacePath: string;
  proposal: PatchProposal;
  approval: {
    approved: boolean;
    approvedBy?: "user" | "admin";
    approvalText?: string;
    approvedChangeIds?: string[];
    dryRunToken?: string;
  };
  options?: {
    dryRun?: boolean;
    createBackup?: boolean;
  };
};

export type PatchApplyResult = {
  success: true;
  mode: "safe-write";
  dryRun: boolean;
  applied: boolean;
  requiresHumanApproval: false;
  changedFiles: Array<{
    relativePath: string;
    changeCount: number;
    backupId?: string;
  }>;
  skippedChanges: Array<{
    relativePath: string;
    reason: string;
  }>;
  backups: Array<{
    backupId: string;
    relativePath: string;
    created: boolean;
  }>;
  safety: {
    wroteFiles: boolean;
    ranCommands: false;
    blockedSensitiveFiles: string[];
    warnings: string[];
  };
  testSuggestions: string[];
  dryRunToken?: string;
  dryRunFingerprint?: string;
};
