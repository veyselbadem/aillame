import { createWorkspaceAgentPlan } from "../src/core/agent/planning";
import {
  createInitialPlanReviewState,
  updatePlanStepReview,
} from "../src/core/agent/planning/plan-review-state";
import { createPlanReviewSummary } from "../src/core/agent/planning/plan-review-summary";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeTest() {
  console.log("Running Phase 50 Workspace Agent Review Summary smoke tests...");

  // 1. Setup plan and review state
  const plan = createWorkspaceAgentPlan({
    mode: "plan_only",
    userGoal: "Check C:\\secrets\\token.txt and fix it",
    maxSteps: 2,
  });

  const initialState = createInitialPlanReviewState(plan, "test-plan-50");
  const stateWithReview = updatePlanStepReview(
    initialState,
    plan.steps[0].stepId,
    "approved_for_future",
    "Path is C:\\Users\\Admin\\Desktop and key is ABC123"
  );

  // 2. Generate summary
  const summary = createPlanReviewSummary(plan, stateWithReview);

  // 3. Validate stats
  assert(summary.planId === "test-plan-50", "Plan ID mismatch");
  assert(summary.stats.totalSteps === plan.steps.length, "Total steps mismatch");
  assert(summary.stats.approvedCount === 1, "Approved count mismatch");
  assert(summary.stats.pendingCount === plan.steps.length - 1, "Pending count mismatch");
  console.log("- Stats validation passed.");

  // 4. Validate sanitization in text preview
  const text = summary.safeTextPreview;
  assert(text.includes("[PATH_MASKED]"), "Path not masked in summary text");
  assert(text.includes("[SECRET_MASKED]"), "Secret not masked in summary text");
  assert(!text.includes("C:\\secrets"), "Sensitive path leaked in summary text");
  assert(!text.includes("ABC123"), "Sensitive key leaked in summary text");
  console.log("- Sanitization validation passed.");

  // 5. Validate execution boundary mentions
  assert(text.includes("executable=false"), "Execution boundary not mentioned in summary text");
  assert(text.includes("non-executable"), "Non-executable status not mentioned");
  console.log("- Execution boundary validation passed.");

  // 6. Security audit: no restricted fields in text
  const restrictedPatterns = [
    "ActionExecutor",
    "CommandRegistry",
    "fileWrite",
    "shellExecute",
    "fullPath",
    "canonicalPath",
  ];
  restrictedPatterns.forEach((pattern) => {
    assert(!text.includes(pattern), `Summary text must not contain ${pattern}`);
  });
  console.log("- Security audit passed.");

  // 7. Validate step status labels in text
  assert(
    text.includes("APPROVED (gelecekte izinli fazda değerlendirilebilir)"),
    "Approval label missing or incorrect"
  );
  assert(text.includes("PENDING (beklemede)"), "Pending label missing or incorrect");
  console.log("- Labels validation passed.");

  console.log("Phase 50 workspace agent review summary smoke tests passed.");
}

runSmokeTest().catch((error) => {
  console.error("Phase 50 workspace agent review summary smoke tests failed:", error.message);
  process.exit(1);
});
