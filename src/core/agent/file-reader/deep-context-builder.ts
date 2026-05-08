import { AgentFileReader } from "./agent-file-reader";
import { DeepContextPackage, AgentFileSummary } from "./types";
import { AgentPlan } from "../planner/types";

export class DeepContextBuilder {
  private reader = new AgentFileReader();

  async build(plan: AgentPlan, workspacePath: string, requestedPaths?: string[]): Promise<DeepContextPackage> {
    const selectedFiles: AgentFileSummary[] = [];
    const skippedFiles: DeepContextPackage["skippedFiles"] = [];
    const blockedSensitiveFiles: string[] = [];

    // Candidate selection
    const candidates = requestedPaths || this.selectCandidatesFromPlan(plan);

    for (const relPath of candidates) {
      const summary = await this.reader.readFile(workspacePath, relPath);
      if (summary) {
        selectedFiles.push(summary);
      } else {
        skippedFiles.push({ relativePath: relPath, reason: "Security block, missing file, or unsupported format." });
        blockedSensitiveFiles.push(relPath);
      }
    }

    return {
      success: true,
      mode: "read-only-deep-context",
      workspace: {
        safeRootName: plan.workspace.safeRootName,
        projectType: plan.workspace.projectType,
        detectedFrameworks: plan.workspace.detectedFrameworks,
        detectedLanguages: plan.workspace.detectedLanguages,
      },
      task: {
        original: plan.task.original,
        sanitized: plan.task.sanitized,
        category: plan.task.intent.category,
        intent: {
          category: plan.task.intent.category,
          confidence: plan.task.intent.confidence,
          riskLevel: plan.task.intent.riskLevel
        }
      },
      selectedFiles,
      skippedFiles,
      safety: {
        readOnly: true,
        willModifyFiles: false,
        willRunCommands: false,
        secretsRedacted: selectedFiles.some(f => f.redacted),
        blockedSensitiveFiles: Array.from(new Set(blockedSensitiveFiles)),
        warnings: plan.workspace.warnings
      },
      analysisHints: this.generateHints(plan, selectedFiles)
    };
  }

  private selectCandidatesFromPlan(plan: AgentPlan): string[] {
    const important = plan.workspace.importantFiles.slice(0, 4);
    const likely = plan.task.intent.likelyAreas.slice(0, 2);
    
    // Simple heuristic: pick important files + some areas
    return Array.from(new Set([...important, ...likely])).slice(0, 8);
  }

  private generateHints(plan: AgentPlan, files: AgentFileSummary[]): string[] {
    const hints = [...plan.plan.summary.split(". ")];
    if (files.some(f => f.extension === ".prisma")) {
      hints.push("Database schema detected. Check prisma/schema.prisma for data models.");
    }
    if (files.some(f => f.relativePath.includes("route.ts"))) {
      hints.push("API routes detected. Analyze route handlers for data flow.");
    }
    return hints;
  }
}
