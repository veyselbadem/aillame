import { 
  createInitialReadinessReviewState, 
  updatePermissionReview, 
  sanitizeReadinessReviewNote 
} from '../src/core/agent/execution-readiness/readiness-review-state';
import { WorkspaceAgentExecutionReadinessResult } from '../src/core/agent/execution-readiness/readiness-types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeTest() {
  console.log("Running Phase 58 Workspace Agent Readiness Review State Smoke tests...");

  const mockResult: WorkspaceAgentExecutionReadinessResult = {
    planId: "smoke_plan_58",
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

  // 1. Initial state check
  const state = createInitialReadinessReviewState(mockResult);
  console.log("- Initial state creation: passed.");
  assert(state.planId === "smoke_plan_58", "Plan ID mismatch.");
  assert(state.status === "not_started", "Initial status should be not_started.");
  assert(state.permissionReviews[0].reviewStatus === "pending", "Initial permission status should be pending.");

  // 2. Update review check
  const updatedState = updatePermissionReview(state, "p1", "acknowledged_for_future", "Looking good.");
  console.log("- Update permission review: passed.");
  assert(updatedState.status === "in_review", "Status should be in_review.");
  assert(updatedState.permissionReviews[0].reviewStatus === "acknowledged_for_future", "Status mapping failed.");
  assert(updatedState.reviewedPermissionCount === 1, "Counter mismatch.");

  // 3. Sanitizer check
  const note = "Secret key: 12345 and path C:\\Users\\Admin";
  const sanitized = sanitizeReadinessReviewNote(note);
  console.log("- Note sanitization: passed.");
  assert(sanitized.includes("[SECRET_MASKED]"), "Secret not masked.");
  assert(sanitized.includes("[PATH_MASKED]"), "Path not masked.");

  // 4. Boundary check: satisfied remains false
  // Since we don't have a grant-back function, we check that updatePermissionReview 
  // only modifies the reviewState, not the underlying result or any grant.
  assert(mockResult.permissions[0].satisfied === false, "Boundary violation: result.satisfied modified.");

  console.log("Phase 58 workspace agent readiness review state smoke tests passed.");
}

runSmokeTest().catch((error) => {
  console.error("Phase 58 workspace agent readiness review state smoke tests failed:", error.message);
  process.exit(1);
});
