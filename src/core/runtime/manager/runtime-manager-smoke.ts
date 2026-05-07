import { getRuntimeLifecycleSummary } from "./runtime-manager";
import { planRuntimeLifecycleAction } from "./runtime-action-planner";
import { buildRuntimeManagerReport, formatRuntimeActionPlan } from "./runtime-manager-report";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  console.log("Starting Runtime Manager Smoke Test...");

  const summary = getRuntimeLifecycleSummary();
  const report = buildRuntimeManagerReport(summary);

  assert(summary.success, "Summary should be successful");
  assert(summary.total >= 4, "Should find at least 4 models/runtimes");
  assert(summary.entries.some((e) => e.id === "aillame-nano"), "Nano should be present");
  assert(summary.entries.some((e) => e.id === "aillame-managed-text-worker-placeholder"), "Managed worker should be present");

  const nano = summary.entries.find((e) => e.id === "aillame-nano");
  assert(nano?.state === "available", "Nano should be available");
  assert(nano?.canGenerate === true, "Nano should be able to generate");

  const worker = summary.entries.find((e) => e.id === "aillame-managed-text-worker-placeholder");
  assert(worker?.state === "disabled", "Worker should be disabled");
  assert(worker?.canGenerate === false, "Worker should not generate in this phase");

  // Test Action Planner
  const inspectPlan = planRuntimeLifecycleAction({
    runtimeId: "aillame-nano",
    action: "inspect",
    dryRun: true,
  });
  assert(inspectPlan.success, "Inspect plan should be successful");
  assert(inspectPlan.risk === "safe", "Inspect risk should be safe");

  const startWorkerPlan = planRuntimeLifecycleAction({
    runtimeId: "aillame-managed-text-worker-placeholder",
    action: "start",
    dryRun: true,
  });
  assert(!startWorkerPlan.allowed, "Start worker plan should be blocked in this phase");
  assert(startWorkerPlan.risk === "blocked", "Start risk should be blocked");

  const stopNanoPlan = planRuntimeLifecycleAction({
    runtimeId: "aillame-nano",
    action: "stop",
    dryRun: true,
  });
  assert(!stopNanoPlan.allowed, "Stop nano should be blocked");
  assert(stopNanoPlan.risk === "blocked", "Stop nano risk should be blocked");


  console.log("=== SUMMARY REPORT PREVIEW ===");
  console.log(report.slice(0, 10).join("\n"));
  console.log("...");
  console.log("");

  console.log("=== ACTION PLAN PREVIEW (START WORKER) ===");
  console.log(formatRuntimeActionPlan(startWorkerPlan).join("\n"));

  console.log("");
  console.log("[PASS] Runtime Manager Smoke Test completed.");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
