import { createWorkspaceAgentPlan, WORKSPACE_AGENT_PLANNING_POLICY } from "../src/core/agent/planning";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function containsSensitiveFields(value: string): boolean {
  return /"(?:fullPath|canonicalPath|stdout|stderr|pid)"|\bstack trace\b|\bsystem prompt\b|\bhidden prompt\b|ActionExecutor|Command Registry/i.test(value);
}

async function runSmokeTest() {
  console.log("Running Phase 47 Workspace Agent Planning Boundary smoke tests...");

  const plan = createWorkspaceAgentPlan({
    mode: "plan_only",
    userGoal: "Workspace içinde /Users/demo/project için npm run build çalıştır ve src/app.ts dosyasını yaz",
    visibleContextSummary: "Visible context mentions secret token and C:\\demo\\project\\src\\app.ts",
    allowedScope: {
      label: "workspace planning scope",
      description: "Plan only scope without execution or file writes",
      allowedCategories: ["inspect", "edit_proposal", "test_proposal", "manual_review", "ask_user"],
      requiresExplicitPermission: true,
    },
    maxSteps: 6,
  });

  assert(plan.mode === "plan_only", "Plan mode must always be plan_only.");
  assert(plan.request.mode === "plan_only", "Request mode must remain plan_only.");
  assert(plan.steps.length >= 3, "Plan should produce at least 3 steps.");
  assert(plan.steps.every((step) => step.executable === false), "All steps must be non-executable.");
  assert(plan.steps.every((step) => !/npm run build|src\/app\.ts|C:\\demo\\project/i.test(step.description)), "Plan steps must not leak raw command or raw path content.");
  assert(plan.warnings.some((warning) => warning.code === "COMMAND_LIKE_INPUT"), "Command-like input should raise a warning.");
  assert(plan.warnings.some((warning) => warning.code === "FILE_WRITE_INTENT"), "File-write intent should raise a warning.");
  assert(plan.warnings.some((warning) => warning.code === "SECRET_PATTERN"), "Secret pattern should be masked and warned.");
  assert(plan.warnings.some((warning) => warning.code === "PATH_PATTERN"), "Path-like content should be masked and warned.");
  assert(plan.steps.some((step) => step.type === "edit_proposal" || step.type === "test_proposal"), "Plan should include proposal steps for edit/test intent.");
  assert(plan.risks.length > 0, "Plan should contain risk entries.");
  assert(plan.notes.length > 0, "Plan should include policy notes.");

  const serialized = JSON.stringify(plan);
  assert(!containsSensitiveFields(serialized), "Sensitive execution or prompt fields must not appear in planning output.");
  assert(!serialized.includes("fullPath"), "fullPath must not be present in planning output.");
  assert(!serialized.includes("canonicalPath"), "canonicalPath must not be present in planning output.");
  assert(!serialized.includes("stdout"), "stdout must not be present in planning output.");
  assert(!serialized.includes("stderr"), "stderr must not be present in planning output.");
  assert(!/"pid"\s*:/.test(serialized), "PID must not be present in planning output.");
  assert(!serialized.includes("stack trace"), "Stack traces must not be present in planning output.");
  assert(!serialized.includes("ActionExecutor"), "ActionExecutor must not be referenced in planning output.");
  assert(!serialized.includes("Command Registry"), "Command Registry must not be referenced in planning output.");

  const unclearPlan = createWorkspaceAgentPlan({
    mode: "plan_only",
    userGoal: "something",
  });

  assert(unclearPlan.status === "needs_user_input", "Unclear goals should request user input.");
  assert(unclearPlan.steps.some((step) => step.type === "ask_user"), "Unclear goals should include ask_user step.");

  assert(WORKSPACE_AGENT_PLANNING_POLICY.mode === "plan_only", "Policy must stay plan_only.");
  assert(WORKSPACE_AGENT_PLANNING_POLICY.allowsExecution === false, "Execution must be disabled.");
  assert(WORKSPACE_AGENT_PLANNING_POLICY.allowsFileWrites === false, "File writes must be disabled.");
  assert(WORKSPACE_AGENT_PLANNING_POLICY.allowsShellCommands === false, "Shell commands must be disabled.");

  console.log("Phase 47 workspace agent planning boundary smoke tests passed.");
}

runSmokeTest().catch((error) => {
  console.error("Phase 47 workspace agent planning boundary smoke tests failed:", error.message);
  process.exit(1);
});