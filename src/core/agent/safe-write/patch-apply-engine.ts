import fs from "fs/promises";
import path from "path";
import { PatchApplyRequest, PatchApplyResult } from "./types";
import { ApprovalGate } from "./approval-gate";
import { WritePolicy } from "./write-policy";
import { BackupStore } from "./backup-store";
import { PatchChange } from "../patch-proposal/types";
import { DryRunProofStore } from "./dry-run-proof";
import { resolveExistingPathInWorkspace } from "../workspace-scanner/path-policy";

export class PatchApplyEngine {
  private approvalGate = new ApprovalGate();
  private writePolicy = new WritePolicy();

  async apply(request: PatchApplyRequest): Promise<PatchApplyResult> {
    // 1. Approval Gate
    const approval = this.approvalGate.validate(request);
    if (!approval.ok) {
      throw new Error(`APPROVAL_REQUIRED: ${approval.reason}`);
    }

    const result: PatchApplyResult = {
      success: true,
      mode: "safe-write",
      dryRun: request.options?.dryRun ?? false,
      applied: false,
      requiresHumanApproval: false,
      changedFiles: [],
      skippedChanges: [],
      backups: [],
      safety: { wroteFiles: false, ranCommands: false, blockedSensitiveFiles: [], warnings: [] },
      testSuggestions: request.proposal.testSuggestions
    };

    if (!result.dryRun && !DryRunProofStore.validate(request)) {
      throw new Error("DRY_RUN_REQUIRED: A matching server-side dry-run token is required before applying changes.");
    }

    const backupStore = new BackupStore(request.workspacePath);
    const filesToModify = Array.from(new Set(request.proposal.changes.map(c => c.relativePath)));

    for (const relPath of filesToModify) {
      const changes = request.proposal.changes.filter(c => c.relativePath === relPath);
      
      // Filter approved changes if list provided
      const approvedChanges = request.approval.approvedChangeIds 
        ? changes.filter((_, i) => request.approval.approvedChangeIds?.includes(`change-${i}`)) 
        : changes;

      if (approvedChanges.length === 0) continue;

      try {
        const fullPath = resolveExistingPathInWorkspace(request.workspacePath, relPath);
        if (!fullPath) {
          result.skippedChanges.push({ relativePath: relPath, reason: "UNSAFE_PATH: target is outside workspace, missing, or a symlink." });
          result.safety.blockedSensitiveFiles.push(relPath);
          continue;
        }
        const stats = await fs.stat(fullPath);
        
        const policy = this.writePolicy.isAllowed(relPath, stats.size);
        if (!policy.allowed) {
          result.skippedChanges.push({ relativePath: relPath, reason: policy.reason || "Policy block" });
          result.safety.blockedSensitiveFiles.push(relPath);
          continue;
        }

        let content = await fs.readFile(fullPath, "utf-8");
        let modified = false;

        for (const change of approvedChanges) {
          const applyResult = this.applySingleChange(content, change);
          if (applyResult.success) {
            content = applyResult.newContent;
            modified = true;
          } else {
            result.skippedChanges.push({ relativePath: relPath, reason: applyResult.reason });
          }
        }

        if (modified) {
          if (!result.dryRun) {
            // Backup
            if (request.options?.createBackup !== false) {
              const backupId = await backupStore.createBackup(request.workspacePath, relPath);
              result.backups.push({ backupId, relativePath: relPath, created: true });
            }
            // Write
            await fs.writeFile(fullPath, content, "utf-8");
            result.safety.wroteFiles = true;
          }
          result.changedFiles.push({ relativePath: relPath, changeCount: approvedChanges.length });
        }

      } catch (error: any) {
        result.skippedChanges.push({ relativePath: relPath, reason: error.message });
      }
    }

    if (result.dryRun) {
      const proof = DryRunProofStore.issue(request);
      result.dryRunToken = proof.token;
      result.dryRunFingerprint = proof.fingerprint;
    }

    result.applied = result.safety.wroteFiles;
    return result;
  }

  private applySingleChange(content: string, change: PatchChange): { success: boolean; newContent: string; reason: string } {
    if (change.changeType === "replace-block") {
      if (!change.beforeSnippet) return { success: false, newContent: content, reason: "Missing beforeSnippet" };
      if (!content.includes(change.beforeSnippet)) return { success: false, newContent: content, reason: "CONTENT_MISMATCH: beforeSnippet not found" };
      
      const parts = content.split(change.beforeSnippet);
      if (parts.length > 2) return { success: false, newContent: content, reason: "AMBIGUOUS_MATCH: multiple beforeSnippet found" };
      
      return { success: true, newContent: content.replace(change.beforeSnippet, change.afterSnippet || ""), reason: "" };
    }

    if (change.changeType === "insert-after") {
      if (!change.beforeSnippet) return { success: false, newContent: content, reason: "Missing anchor (beforeSnippet)" };
      if (!content.includes(change.beforeSnippet)) return { success: false, newContent: content, reason: "CONTENT_MISMATCH: anchor not found" };
      
      return { success: true, newContent: content.replace(change.beforeSnippet, `${change.beforeSnippet}\n${change.afterSnippet}`), reason: "" };
    }

    if (change.changeType === "insert-before") {
      if (!change.beforeSnippet) return { success: false, newContent: content, reason: "Missing anchor (beforeSnippet)" };
      if (!content.includes(change.beforeSnippet)) return { success: false, newContent: content, reason: "CONTENT_MISMATCH: anchor not found" };
      
      return { success: true, newContent: content.replace(change.beforeSnippet, `${change.afterSnippet}\n${change.beforeSnippet}`), reason: "" };
    }

    return { success: false, newContent: content, reason: `UNSUPPORTED_CHANGE_TYPE: ${change.changeType}` };
  }
}
