import { CodeAgentRiskLevel, CodeAgentTaskType } from "./code-agent-types";

export type CodePatchWorkflowStatus =
  | "draft"
  | "proposed"
  | "awaiting-approval"
  | "approved"
  | "rejected"
  | "applying"
  | "applied"
  | "verifying"
  | "verified"
  | "failed"
  | "blocked"
  | "rolled-back"
  | "cancelled";

export type CodePatchApprovalState =
  | "not-required"
  | "required"
  | "approved"
  | "rejected"
  | "expired"
  | "invalid";

export type CodePatchChangeType = "create" | "update" | "delete" | "rename" | "unknown";

export interface CodePatchFileChange {
  filePath: string;
  changeType: CodePatchChangeType;
  beforeSnippet?: string;
  afterSnippet?: string;
  unifiedDiff?: string;
  additions: number;
  deletions: number;
  riskLevel: CodeAgentRiskLevel;
  warnings: string[];
}

export interface CodePatchProposal {
  summary: string;
  files: CodePatchFileChange[];
  totalAdditions: number;
  totalDeletions: number;
  riskLevel: CodeAgentRiskLevel;
}

export interface CodePatchApproval {
  requestId: string;
  workflowId: string;
  status: CodePatchApprovalState;
  token?: string;
  expiresAt?: number;
  requestedAt: number;
  processedAt?: number;
}

export interface CodePatchVerifierPlan {
  commands: string[];
  requiresApproval: boolean;
  allowlistedOnly: boolean;
}

export interface CodePatchRollbackNote {
  canRollback: boolean;
  reason?: string;
  originalSnapshots?: Record<string, string>; // file path -> content hash or snippet
  restoreInstructions: string;
}

export interface CodePatchWorkflow {
  workflowId: string;
  projectId: string;
  sourceApp: string;
  taskType: CodeAgentTaskType;
  status: CodePatchWorkflowStatus;
  riskLevel: CodeAgentRiskLevel;
  approvalRequired: boolean;
  approvalState: CodePatchApprovalState;
  proposal: CodePatchProposal;
  safety: {
    allowed: boolean;
    reason?: string;
    blockedFiles: string[];
    warnings: string[];
  };
  verifierPlan: CodePatchVerifierPlan;
  rollbackNotes: CodePatchRollbackNote;
  auditEventIds: string[];
  createdAt: number;
  updatedAt: number;
  diagnostics: Record<string, any>;
}

export interface CodePatchApplyRequest {
  workflowId: string;
  approvalToken: string;
  mode: "preview-only" | "dry-run" | "apply";
}

export interface CodePatchApplyResult {
  success: boolean;
  workflowId: string;
  appliedFiles: string[];
  failedFiles: string[];
  rollbackId?: string;
  error?: string;
  diagnostics: any;
}
