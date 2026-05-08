import { PatchApplyResult } from "../safe-write/types";
import { PatchProposal } from "../patch-proposal/types";

export type ExecutionAuditRequest = {
  workspacePath: string;
  applyResult: PatchApplyResult;
  originalProposal?: PatchProposal;
  userTask?: string;
};

export type ExecutionAuditResult = {
  success: true;
  mode: "post-write-audit";
  ranCommands: false;
  ranTests: false;
  applied: boolean;
  status: "verified" | "partially-verified" | "failed" | "dry-run-only";
  changedFiles: Array<{
    relativePath: string;
    changeCount: number;
    backupId?: string;
    verified: boolean;
    verificationNotes: string[];
  }>;
  backups: Array<{
    backupId: string;
    relativePath: string;
    available: boolean;
    rollbackHint: string;
  }>;
  verificationPlan: {
    summary: string;
    suggestedCommands: Array<{
      command: string;
      reason: string;
      risk: "low" | "medium" | "high";
      autoRun: false;
    }>;
    manualChecks: string[];
  };
  riskReview: {
    riskBefore?: "low" | "medium" | "high";
    riskAfter: "low" | "medium" | "high";
    reasons: string[];
  };
  safety: {
    noCommandsExecuted: true;
    noTestsExecuted: true;
    absolutePathsMasked: true;
    secretsExcluded: true;
    warnings: string[];
  };
  nextSteps: string[];
};
