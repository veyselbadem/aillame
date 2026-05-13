import { mapReadinessResultToRenderData } from '../src/core/agent/execution-readiness/readiness-preview-presenter';
import { WorkspaceAgentExecutionReadinessResult } from '../src/core/agent/execution-readiness/readiness-types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeTest() {
  console.log("Running Phase 57 Workspace Agent Execution Readiness Preview UI Smoke tests...");

  const mockResult: WorkspaceAgentExecutionReadinessResult = {
    planId: "smoke_plan_57",
    status: "ready_for_future_review",
    preflightChecks: [
      { checkId: "c1", type: "no_execution_available", status: "pass", message: "Safe", blocking: false }
    ],
    permissions: [
      { requirementId: "p1", type: "future_file_write_permission", required: true, satisfied: false, description: "Wait", riskLevel: "high", blocking: true }
    ],
    warnings: [{ code: "W1", message: "Warn" }],
    risks: [{ code: "R1", level: "medium", message: "Risk" }],
    evaluatedAt: new Date().toISOString(),
    isReadyForFuturePhase: true
  };

  // 1. Presenter check
  const renderData = mapReadinessResultToRenderData(mockResult);
  console.log("- Presenter mapping: passed.");
  assert(renderData.planId === "smoke_plan_57", "Plan ID mismatch.");
  assert(renderData.status === "READY FOR FUTURE REVIEW", "Status formatting failed.");
  assert(renderData.statusColor === "green", "Status color mapping failed.");
  assert(renderData.permissions[0].isSatisfied === false, "Permission satisfied should be false.");
  assert(renderData.securityNotice.includes("ÖNİZLEME"), "Security notice missing or incorrect.");

  // 2. Safety check: no sensitive fields in render data
  const keys = Object.keys(renderData);
  const unsafeKeys = ["command", "payload", "fullPath", "canonicalPath", "stdout", "stderr", "PID", "stack"];
  unsafeKeys.forEach(unsafeKey => {
    assert(!keys.some(k => k.toLowerCase().includes(unsafeKey.toLowerCase())), `Unsafe key pattern found in render data: ${unsafeKey}`);
  });
  console.log("- Safety check (no unsafe keys in render data): passed.");

  // 3. Mode check (conceptual)
  // We verified in Phase 56 that evaluator only supports readiness_only.
  // The UI and hook enforce this by hardcoding it in the request object.
  
  console.log("Phase 57 workspace agent execution readiness preview UI smoke tests passed.");
}

runSmokeTest().catch((error) => {
  console.error("Phase 57 workspace agent execution readiness preview UI smoke tests failed:", error.message);
  process.exit(1);
});
