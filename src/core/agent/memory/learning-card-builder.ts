import { LearningCard, LearningCardOutcome } from "./types";
import { MemoryPolicy } from "./memory-policy";
import { ExecutionAuditResult } from "../execution-audit/types";

export class LearningCardBuilder {
  private static generateId(): string {
    return `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static fromAudit(
    audit: ExecutionAuditResult, 
    userTask: string, 
    safeRootName: string
  ): LearningCard {
    const outcome: LearningCardOutcome = 
      audit.status === "verified" ? "success" : 
      audit.status === "partially-verified" ? "partial" : "failed";

    const changedFiles = audit.changedFiles.map(c => c.relativePath);
    const changedAreas = this.extractAreas(changedFiles);
    
    const card: LearningCard = {
      id: this.generateId(),
      createdAt: Date.now(),
      projectId: safeRootName, // Fixed: use safeRootName argument
      safeRootName: safeRootName,
      taskCategory: "general", // Audit type doesn't have intent directly
      taskSummary: MemoryPolicy.redact(userTask.slice(0, 200)),
      outcome,
      changedAreas,
      appliedChangeTypes: ["modification"], // Simplified for card
      verificationSuggestions: audit.verificationPlan.suggestedCommands.map(cmd => cmd.command),
      riskLevel: audit.riskReview.riskAfter,
      lessons: this.deriveLessons(audit, outcome),
      safetyNotes: audit.safety.warnings,
      source: "execution-audit"
    };

    return card;
  }

  private static extractAreas(files: string[]): string[] {
    const areas = new Set<string>();
    for (const file of files) {
      if (file.startsWith("src/core/agent")) areas.add("agent-core");
      else if (file.startsWith("src/core/runtime")) areas.add("runtime");
      else if (file.startsWith("src/app/admin")) areas.add("admin-ui");
      else if (file.startsWith("src/app/api")) areas.add("api-routes");
      else if (file.includes("package.json")) areas.add("dependencies");
      else if (file.startsWith("docs")) areas.add("documentation");
      else areas.add("general-code");
    }
    return Array.from(areas);
  }

  private static deriveLessons(audit: ExecutionAuditResult, outcome: LearningCardOutcome): string[] {
    const lessons: string[] = [];
    if (outcome === "success") {
      lessons.push(`Successfully modified ${audit.changedFiles.length} files.`);
      if (audit.verificationPlan.suggestedCommands.length > 0) {
        lessons.push(`Verification requires: ${audit.verificationPlan.suggestedCommands[0].command}`);
      }
    } else if (outcome === "partial") {
      lessons.push("Some changes were skipped due to content mismatch or policy blocks.");
    }
    return lessons;
  }
}
