import { createWorkspaceAgentPlan } from "../src/core/agent/planning";
import { createInitialPlanReviewState, updatePlanStepReview, sanitizePlanReviewNote } from "../src/core/agent/planning/plan-review-state";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeTest() {
  console.log("Running Phase 49 Workspace Agent Plan Review Skeleton smoke tests...");

  // 1. Setup a plan
  const plan = createWorkspaceAgentPlan({
    mode: "plan_only",
    userGoal: "Check the source code and propose a fix for path C:\\Users\\demo\\secret.txt",
    maxSteps: 3
  });

  console.log("- Plan created with goal:", plan.request.userGoal);

  // 2. Initial state
  const state = createInitialPlanReviewState(plan, "test-plan-1");
  assert(state.planId === "test-plan-1", "Plan ID mismatch");
  assert(state.status === "not_started", "Initial status should be not_started");
  assert(state.stepReviews.length === plan.steps.length, "Step review count mismatch");
  assert(state.stepReviews.every(sr => sr.reviewStatus === "pending"), "All steps should be pending initially");
  assert(state.approvedStepCount === 0, "Approved count should be 0");
  assert(state.rejectedStepCount === 0, "Rejected count should be 0");
  console.log("- Initial review state validated.");

  // 3. Update step to approved_for_future
  const firstStepId = plan.steps[0].stepId;
  const state2 = updatePlanStepReview(state, firstStepId, "approved_for_future", "Looks good. Apply this later.");
  assert(state2.status === "in_review", "Status should be in_review");
  assert(state2.approvedStepCount === 1, "Approved count should be 1");
  assert(state2.stepReviews.find(sr => sr.stepId === firstStepId)?.reviewStatus === "approved_for_future", "Status update failed");
  assert(state2.stepReviews.find(sr => sr.stepId === firstStepId)?.note === "Looks good. Apply this later.", "Note was not saved correctly");
  console.log("- Step review update (approved_for_future) validated.");

  // 4. Note sanitization / masking
  const sensitiveNote = "Check this path: C:\\Users\\admin\\secrets\\key.txt and use token: abcdef1234567890abcdef1234567890";
  const sanitized = sanitizePlanReviewNote(sensitiveNote);
  assert(sanitized.includes("[PATH_MASKED]"), "Path was not masked");
  assert(sanitized.includes("[SECRET_MASKED]"), "Secret was not masked");
  assert(!sanitized.includes("C:\\Users\\admin"), "Raw path leaked");
  assert(!sanitized.includes("abcdef1234567890"), "Raw secret leaked");
  console.log("- Note sanitization and masking validated.");

  const state3 = updatePlanStepReview(state2, plan.steps[1].stepId, "rejected", "Path is: /etc/passwd and key: 12345-67890-ABCDE");
  assert(state3.rejectedStepCount === 1, "Rejected count should be 1");
  assert(state3.stepReviews.find(sr => sr.stepId === plan.steps[1].stepId)?.note?.includes("[PATH_MASKED]"), "Path in note was not masked");
  console.log("- Step review update (rejected) with masked note validated.");

  // 5. Completion (reviewed status)
  let finalState = state3;
  for (let i = 2; i < plan.steps.length; i++) {
    finalState = updatePlanStepReview(finalState, plan.steps[i].stepId, "approved_for_future");
  }
  assert(finalState.status === "reviewed", "Final status should be reviewed");
  assert(finalState.reviewedAt !== undefined, "reviewedAt should be set");
  console.log("- Final reviewed state validated.");

  // 6. Non-executable guarantee
  assert(plan.steps.every(step => step.executable === false), "Executable=false must be preserved in plan");
  assert(!JSON.stringify(finalState).includes('"executable":true'), "Review state must not contain executable true");
  console.log("- Non-executable guarantee validated.");

  // 7. Security audit: no restricted modules
  const stateStr = JSON.stringify(finalState);
  const restrictedPatterns = ["ActionExecutor", "CommandRegistry", "fileWrite", "shellExecute"];
  restrictedPatterns.forEach(pattern => {
    assert(!stateStr.includes(pattern), `Review state must not contain reference to ${pattern}`);
  });
  console.log("- Security audit (no restricted references) validated.");

  console.log("Phase 49 workspace agent plan review skeleton smoke tests passed.");
}

runSmokeTest().catch((error) => {
  console.error("Phase 49 workspace agent plan review skeleton smoke tests failed:", error.message);
  process.exit(1);
});
