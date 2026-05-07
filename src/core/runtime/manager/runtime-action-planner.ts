import type {
  AillameRuntimeActionPlanInput,
  AillameRuntimeActionPlanResult,
  AillameRuntimeLifecycleActionRisk,
} from "./runtime-manager-types";
import { getRuntimeLifecycleSummary } from "./runtime-manager";

export function planRuntimeLifecycleAction(
  input: AillameRuntimeActionPlanInput
): AillameRuntimeActionPlanResult {
  const summary = getRuntimeLifecycleSummary();
  const entry = summary.entries.find((e) => e.id === input.runtimeId);

  if (!entry) {
    return {
      success: false,
      mode: "dry-run",
      runtimeId: input.runtimeId,
      action: input.action,
      allowed: false,
      risk: "blocked",
      reason: "Runtime ID not found in the manager inventory.",
      steps: [],
      blockedReasons: ["UNKNOWN_RUNTIME_ID"],
      safetyNotes: ["Verify the runtime ID in the Model Registry."],
    };
  }

  const steps: string[] = [`Initial state: ${entry.state}`, `Domain: ${entry.domain}`];
  const blockedReasons: string[] = [];
  const safetyNotes: string[] = ["Action planning is strictly dry-run in this phase."];
  let allowed = true;
  let risk: AillameRuntimeLifecycleActionRisk = "safe";
  let reason = `Dry-run plan for ${input.action} on ${input.runtimeId}.`;

  switch (input.action) {
    case "inspect":
    case "health-check":
      steps.push("Step 1: Probe runtime interface health.");
      steps.push("Step 2: Collect diagnostics and warnings.");
      risk = "safe";
      break;

    case "start":
    case "stop":
    case "restart":
      allowed = false;
      risk = "blocked";
      blockedReasons.push("LIFECYCLE_EXECUTION_NOT_IMPLEMENTED");
      reason = "Runtime process lifecycle execution is not implemented in this phase.";
      steps.push(`Action ${input.action} requested but blocked.`);
      break;

    case "warmup":
      steps.push("Step 1: Trigger model pre-loading sequence (STUB).");
      allowed = false;
      risk = "review-required";
      reason = "Warmup logic is not implemented in this phase.";
      break;

    case "reload-model":
      steps.push("Step 1: Flush current model context (STUB).");
      steps.push("Step 2: Reload weights from disk (STUB).");
      allowed = false;
      risk = "review-required";
      reason = "Model reloading is not implemented in this phase.";
      break;

    default:
      allowed = false;
      risk = "blocked";
      blockedReasons.push("UNSUPPORTED_LIFECYCLE_ACTION");
      reason = `Action ${input.action} is not implemented.`;
  }


  return {
    success: allowed,
    mode: "dry-run",
    runtimeId: input.runtimeId,
    action: input.action,
    allowed,
    risk,
    reason,
    steps,
    blockedReasons,
    safetyNotes,
  };
}
