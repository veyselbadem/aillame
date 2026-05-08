import { PatchChange, PatchTarget } from "./types";

export class PatchRiskAnalyzer {
  analyze(targets: PatchTarget[], changes: PatchChange[]): { overallRisk: "low" | "medium" | "high"; reasons: string[] } {
    const reasons: string[] = [];
    let riskPoints = 0;

    for (const target of targets) {
      if (target.riskLevel === "high") riskPoints += 3;
      if (target.riskLevel === "medium") riskPoints += 1;
      
      const lowerPath = target.relativePath.toLowerCase();
      if (lowerPath.includes("core/") || lowerPath.includes("runtime/")) {
        reasons.push(`Target file '${target.relativePath}' is part of critical system logic.`);
        riskPoints += 2;
      }
      if (lowerPath.includes("api/")) {
        reasons.push(`Target file '${target.relativePath}' affects API surface.`);
        riskPoints += 1;
      }
    }

    for (const change of changes) {
      if (change.changeType === "delete-block") {
        reasons.push("Deletion of code blocks detected.");
        riskPoints += 2;
      }
      if (change.changeType === "create-file-proposal") {
        reasons.push("New file creation suggested.");
        riskPoints += 1;
      }
    }

    let overallRisk: "low" | "medium" | "high" = "low";
    if (riskPoints >= 5) overallRisk = "high";
    else if (riskPoints >= 2) overallRisk = "medium";

    if (reasons.length === 0) reasons.push("Minor changes in safe files.");

    return { overallRisk, reasons: Array.from(new Set(reasons)) };
  }
}
