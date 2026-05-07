import type { AillameCommandPlanResult, AillameCommandSafetyResult } from "./command-types";

export function buildCommandPlanSteps(safety: AillameCommandSafetyResult): string[] {
  const steps = [
    "Do not execute the command in this phase.",
    "Review command category, risk, warnings, and blocked reasons.",
  ];

  if (safety.allowed) {
    steps.push("Record this command as a candidate for future approved validation.");
  } else {
    steps.push("Ask for user approval and a narrowed command scope before any future execution.");
  }

  if (safety.suggestedSaferAlternative) {
    steps.push(`Prefer safer alternative: ${safety.suggestedSaferAlternative}`);
  }

  return steps;
}

export function summarizeCommandPlan(plan: AillameCommandPlanResult): string {
  return `Dry-run command plan: category=${plan.safety.category}, risk=${plan.safety.risk}, allowed=${plan.safety.allowed}.`;
}
