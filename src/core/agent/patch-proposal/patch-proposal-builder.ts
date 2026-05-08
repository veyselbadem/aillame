import { DeepContextPackage } from "../file-reader/types";
import { PatchProposal, PatchTarget, PatchChange } from "./types";
import { PatchPolicy } from "./patch-policy";
import { DiffBuilder } from "./diff-builder";
import { PatchRiskAnalyzer } from "./patch-risk-analyzer";

export class PatchProposalBuilder {
  private policy = new PatchPolicy();
  private diffBuilder = new DiffBuilder();
  private riskAnalyzer = new PatchRiskAnalyzer();

  build(context: DeepContextPackage): PatchProposal {
    const targets: PatchTarget[] = [];
    const changes: PatchChange[] = [];
    const skippedFiles: PatchProposal["safety"]["skippedFiles"] = [];
    const blockedSensitiveFiles: string[] = [];

    for (const file of context.selectedFiles) {
      const policyResult = this.policy.isAllowed(file.relativePath);
      if (!policyResult.allowed) {
        skippedFiles.push({ relativePath: file.relativePath, reason: policyResult.reason || "Policy block" });
        blockedSensitiveFiles.push(file.relativePath);
        continue;
      }

      const target: PatchTarget = {
        relativePath: file.relativePath,
        language: file.language,
        reason: `Potential update for ${context.task.category} task.`,
        riskLevel: this.estimateFileRisk(file.relativePath)
      };
      targets.push(target);

      // Heuristic proposal generation based on category
      const change = this.generateHeuristicChange(file, context.task.category, context.task.original);
      if (change) changes.push(change);
    }

    const riskInfo = this.riskAnalyzer.analyze(targets, changes);

    return {
      success: true,
      mode: "proposal-only",
      readOnly: true,
      willModifyFiles: false,
      willRunCommands: false,
      requiresHumanApproval: true,
      task: context.task,
      workspace: context.workspace,
      targets,
      changes,
      testSuggestions: this.generateTestSuggestions(context.workspace.projectType),
      riskSummary: riskInfo,
      safety: {
        blockedSensitiveFiles: Array.from(new Set([...context.safety.blockedSensitiveFiles, ...blockedSensitiveFiles])),
        skippedFiles: [...context.skippedFiles, ...skippedFiles],
        warnings: context.safety.warnings,
        secretsRedacted: context.safety.secretsRedacted,
        absolutePathsMasked: true
      },
      nextSteps: [
        "Review the proposed changes carefully.",
        "Approve or edit the snippets manually.",
        "Run suggested tests in a safe environment.",
        "Apply changes using Aillame Patch Apply (Future Phase)."
      ]
    };
  }

  private estimateFileRisk(path: string): "low" | "medium" | "high" {
    if (path.includes("core/") || path.includes("api/")) return "high";
    if (path.includes("components/")) return "medium";
    return "low";
  }

  private generateHeuristicChange(file: any, category: string, task: string): PatchChange | null {
    // For now, generate a comment addition proposal as a placeholder for heuristic
    const before = file.contentPreview.split("\n").slice(0, 5).join("\n");
    const comment = `// TODO: Proposed change for ${category}: ${task.slice(0, 50)}...`;
    const after = `${comment}\n${before}`;

    return {
      relativePath: file.relativePath,
      changeType: "insert-before",
      title: `${category.toUpperCase()} Adjustment`,
      rationale: `Suggesting an initial structure/comment for the ${category} task.`,
      beforeSnippet: before,
      afterSnippet: after,
      unifiedDiff: this.diffBuilder.buildUnifiedDiff(file.relativePath, before, after),
      safetyNotes: ["This is an automated heuristic proposal. Manual validation is required."]
    };
  }

  private generateTestSuggestions(projectType: string): string[] {
    if (projectType === "Next.js" || projectType === "Vite") {
      return ["npm run typecheck", "npm run build", "npm test"];
    }
    return ["Run project-specific verification commands."];
  }
}
