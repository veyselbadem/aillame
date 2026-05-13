import { createReadinessReviewSummary, createReadinessReviewSummaryText } from '../src/core/agent/execution-readiness/readiness-review-summary';
import { WorkspaceAgentExecutionReadinessResult } from '../src/core/agent/execution-readiness/readiness-types';
import { WorkspaceAgentReadinessReviewState } from '../src/core/agent/execution-readiness/readiness-review-types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeTest() {
  console.log("Running Phase 59 Workspace Agent Readiness Review Summary Smoke tests...");

  const mockResult: WorkspaceAgentExecutionReadinessResult = {
    planId: "smoke_plan_59",
    status: "ready_for_future_review",
    preflightChecks: [
      { checkId: "c1", type: "no_execution_available", status: "pass", message: "Safe", blocking: false }
    ],
    permissions: [
      { requirementId: "p1", type: "future_file_write_permission", required: true, satisfied: false, description: "Wait", riskLevel: "high", blocking: true }
    ],
    warnings: [],
    risks: [],
    evaluatedAt: new Date().toISOString(),
    isReadyForFuturePhase: true
  };

  const mockReviewState: WorkspaceAgentReadinessReviewState = {
    planId: "smoke_plan_59",
    status: "reviewed",
    permissionReviews: [
      { requirementId: "p1", reviewStatus: "acknowledged_for_future", note: "Noted." }
    ],
    preflightReviews: [
      { checkId: "c1", reviewStatus: "acknowledged" }
    ],
    warningCount: 0,
    reviewedPermissionCount: 1,
    reviewedPreflightCount: 1
  };

  // 1. Summary creation check
  const summary = createReadinessReviewSummary(mockResult, mockReviewState);
  console.log("- Summary creation: passed.");
  assert(summary.planId === "smoke_plan_59", "Plan ID mismatch.");
  assert(summary.stats.activeGrantCount === 0, "Active grant count must be 0.");
  assert(summary.stats.acknowledgedPermissions === 1, "Acknowledged count mismatch.");

  // 2. Safe text preview check
  const text = summary.safeTextPreview;
  console.log("- Safe text preview: passed.");
  assert(text.includes("BU ÖZET İZİN VERMEZ"), "Security warning missing in text.");
  assert(text.includes("SATISFIED=FALSE"), "satisfied=false mention missing.");
  assert(text.includes("Noted."), "Review note missing in text.");

  // 3. Boundary check: no grant token
  assert(!text.includes("token"), "Summary text contains forbidden 'token' keyword.");
  assert(!text.includes("credential"), "Summary text contains forbidden 'credential' keyword.");
  
  console.log("Phase 59 workspace agent readiness review summary smoke tests passed.");
}

runSmokeTest().catch((error) => {
  console.error("Phase 59 workspace agent readiness review summary smoke tests failed:", error.message);
  process.exit(1);
});
