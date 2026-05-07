import type { AillameRuntimeManagerSummary } from "./runtime-manager-types";

export function buildRuntimeManagerReport(summary: AillameRuntimeManagerSummary): string[] {
  const lines: string[] = [];
  lines.push("=== AILLAME RUNTIME MANAGER REPORT ===");
  lines.push(`Total Runtimes: ${summary.total}`);
  lines.push(`Available: ${summary.available}`);
  lines.push(`Disabled: ${summary.disabled}`);
  lines.push(`Unavailable: ${summary.unavailable}`);
  lines.push(`Degraded: ${summary.degraded}`);
  lines.push("");

  summary.entries.forEach((entry) => {
    // Standardize report line to avoid (undefined) suffix
    lines.push(`[${entry.domain.toUpperCase()}] ${entry.id}`);
    lines.push(`  Type: ${entry.runtimeType || "unknown"}`);
    if (entry.healthKind) {
      lines.push(`  Kind: ${entry.healthKind}`);
    }
    lines.push(`  State: ${entry.state}`);
    lines.push(`  Can Generate: ${entry.canGenerate}`);
    lines.push(`  Capabilities: ${entry.capabilities.join(", ")}`);
    
    if (entry.warnings.length > 0) {
      lines.push(`  Warnings: ${entry.warnings.length}`);
      entry.warnings.forEach((w) => lines.push(`    - ${w}`));
    }
    
    if (entry.reason) {
      lines.push(`  Notes: ${entry.reason}`);
    }
    lines.push("");
  });

  if (summary.warnings.length > 0) {
    lines.push("MANAGER WARNINGS:");
    summary.warnings.forEach((w) => lines.push(`- ${w}`));
  }

  return lines;
}

export function formatRuntimeActionPlan(plan: any): string[] {
  const lines: string[] = [];
  lines.push(`=== RUNTIME ACTION PLAN: ${plan.action.toUpperCase()} ===`);
  lines.push(`Runtime: ${plan.runtimeId}`);
  lines.push(`Mode: ${plan.mode}`);
  lines.push(`Allowed: ${plan.allowed}`);
  lines.push(`Risk: ${plan.risk}`);
  lines.push(`Reason: ${plan.reason}`);
  lines.push("");

  if (plan.steps.length > 0) {
    lines.push("PROPOSED STEPS:");
    plan.steps.forEach((step: string, i: number) => lines.push(`${i + 1}. ${step}`));
    lines.push("");
  }

  if (plan.blockedReasons.length > 0) {
    lines.push("BLOCKED REASONS:");
    plan.blockedReasons.forEach((r: string) => lines.push(`- ${r}`));
    lines.push("");
  }

  if (plan.safetyNotes.length > 0) {
    lines.push("SAFETY NOTES:");
    plan.safetyNotes.forEach((n: string) => lines.push(`- ${n}`));
    lines.push("");
  }

  return lines;
}
