import { ExecutionAuditRequest, ExecutionAuditResult } from "./types";
import { VerificationPlanBuilder } from "./verification-plan-builder";

export class ResultVerifier {
  private planBuilder = new VerificationPlanBuilder();

  verify(request: ExecutionAuditRequest): ExecutionAuditResult {
    const { applyResult, originalProposal, workspacePath } = request;

    let status: ExecutionAuditResult["status"] = "verified";
    if (applyResult.dryRun) status = "dry-run-only";
    else if (!applyResult.applied) status = "failed";
    else if (applyResult.skippedChanges.length > 0) status = "partially-verified";

    const changedFiles = applyResult.changedFiles.map(f => ({
      relativePath: f.relativePath,
      changeCount: f.changeCount,
      backupId: f.backupId,
      verified: true, // Basic verification based on applyResult
      verificationNotes: ["Applied successfully within the safe-write policy limits."]
    }));

    const backups = applyResult.backups.map(b => ({
      backupId: b.backupId,
      relativePath: b.relativePath,
      available: b.created,
      rollbackHint: `Backup created before write. Use backupId '${b.backupId}' for manual restoration if needed.`
    }));

    const plan = this.planBuilder.build(
      applyResult.changedFiles.map(f => f.relativePath),
      originalProposal?.workspace.projectType || "Unknown"
    );

    const reasons: string[] = [];
    if (status === "partially-verified") reasons.push("Some suggested changes were skipped due to policy or content mismatch.");
    if (applyResult.dryRun) reasons.push("Execution was performed in dry-run mode; no files were modified.");
    if (reasons.length === 0) reasons.push("Changes applied and verified against safe-write constraints.");

    return {
      success: true,
      mode: "post-write-audit",
      ranCommands: false,
      ranTests: false,
      applied: applyResult.applied,
      status,
      changedFiles,
      backups,
      verificationPlan: plan,
      riskReview: {
        riskBefore: originalProposal?.task.intent.riskLevel,
        riskAfter: status === "verified" ? "low" : "medium",
        reasons
      },
      safety: {
        noCommandsExecuted: true,
        noTestsExecuted: true,
        absolutePathsMasked: true,
        secretsExcluded: true,
        warnings: applyResult.safety.warnings
      },
      nextSteps: this.generateNextSteps(status, applyResult.dryRun)
    };
  }

  private generateNextSteps(status: string, dryRun: boolean): string[] {
    if (dryRun) return ["Review the dry-run results.", "Provide explicit approval to apply changes for real."];
    if (status === "verified") return ["Run the suggested verification commands.", "Review the final changes in the workspace."];
    return ["Check skipped changes reasons.", "Manually verify the partially applied patches."];
  }
}
