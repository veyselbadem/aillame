import { evaluateCommandSafety } from "./command-safety-policy";
import { buildCommandPlanSteps } from "./command-report";
import type { AillameCommandPlanResult, AillameCommandSafetyInput } from "./command-types";

export function planCommandDryRun(input: AillameCommandSafetyInput): AillameCommandPlanResult {
  const safety = evaluateCommandSafety(input);

  return {
    success: true,
    mode: "dry-run-plan",
    command: safety.normalizedCommand,
    safety,
    plan: buildCommandPlanSteps(safety),
    readOnly: true,
    willExecute: false,
  };
}
