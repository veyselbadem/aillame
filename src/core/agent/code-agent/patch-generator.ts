import * as fs from "fs";
import * as path from "path";
import { checkCodeAgentSafety } from "./code-agent-safety";
import type { CodeAgentRiskLevel } from "./code-agent-types";

export type PatchChangeType = "create" | "modify" | "delete" | "rename";
export type PatchRisk = CodeAgentRiskLevel;

export type PatchFileChange = {
  relativePath: string;
  changeType: PatchChangeType;
  summary: string;
};

export type PatchRollbackNote = {
  relativePath: string;
  note: string;
};

export type PatchProposal = {
  proposalId: string;
  summary: string;
  changedFiles: PatchFileChange[];
  diffText?: string;
  reason: string;
  riskLevel: PatchRisk;
  approvalRequired: boolean;
  rollbackNotes: PatchRollbackNote[];
  diagnostics: {
    applyEnabled: false;
    validation: PatchValidationResult;
  };
};

export type PatchValidationResult = {
  valid: boolean;
  warnings: string[];
  errors: string[];
};

export type PatchProposalInput = {
  rootPath: string;
  summary: string;
  changedFiles: PatchFileChange[];
  diffText?: string;
  reason: string;
};

function makeId(): string {
  return `patch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function validatePatchProposal(input: PatchProposalInput): PatchValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!input.diffText?.trim() && input.changedFiles.length === 0) errors.push("EMPTY_PATCH_PROPOSAL");
  if ((input.diffText?.length ?? 0) > 80_000) warnings.push("PATCH_TOO_LARGE_REVIEW_REQUIRED");

  for (const file of input.changedFiles) {
    const target = path.resolve(input.rootPath, file.relativePath);
    const safety = checkCodeAgentSafety({
      rootPath: input.rootPath,
      targetPath: file.relativePath,
      categories: file.changeType === "delete" ? ["file-delete"] : ["file-write"],
    });
    if (safety.violations.length > 0) errors.push(...safety.violations.map((item) => item.code));
    if (!fs.existsSync(target) && file.changeType === "modify") warnings.push(`TARGET_FILE_NOT_FOUND:${file.relativePath}`);
    if (file.changeType === "delete") warnings.push(`DELETE_CHANGE_BLOCKED:${file.relativePath}`);
  }

  return { valid: errors.length === 0, warnings: Array.from(new Set(warnings)), errors: Array.from(new Set(errors)) };
}

export function proposePatch(input: PatchProposalInput): PatchProposal {
  const validation = validatePatchProposal(input);
  const hasHighRiskFile = input.changedFiles.some((file) => /\.(env|pem|key)$/i.test(file.relativePath) || /secret|token|credential/i.test(file.relativePath));
  const riskLevel: PatchRisk = validation.errors.length > 0 ? "blocked" : hasHighRiskFile || input.changedFiles.length > 0 ? "high" : "medium";

  return {
    proposalId: makeId(),
    summary: input.summary,
    changedFiles: input.changedFiles,
    diffText: input.diffText,
    reason: input.reason,
    riskLevel,
    approvalRequired: true,
    rollbackNotes: input.changedFiles.map((file) => ({
      relativePath: file.relativePath,
      note: "Review the diff and keep the previous version available before applying manually.",
    })),
    diagnostics: {
      applyEnabled: false,
      validation,
    },
  };
}
