import { WorkspaceScanner } from '../src/core/agent/workspace-scanner/workspace-scanner';
import { WorkspaceContextBuilder } from '../src/core/agent/planner/workspace-context-builder';
import { TaskIntentDetector } from '../src/core/agent/planner/task-intent-detector';
import { AgentPlanBuilder } from '../src/core/agent/planner/agent-plan-builder';

async function runSmokeTest() {
  console.log("Running Agent Planner Smoke Tests...");

  const workspacePath = process.cwd();
  const userTask = "AI Lab görsel üretim hatasını analiz et ve fixle";

  const results = {
    success: true,
    checks: [] as any[]
  };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    // 1. Scan & Context Test
    console.log("- Testing Workspace Context Building...");
    const scanner = new WorkspaceScanner();
    const scanSummary = await scanner.scan({ workspacePath, maxDepth: 2 });
    
    const contextBuilder = new WorkspaceContextBuilder();
    const context = contextBuilder.build(scanSummary);
    
    addCheck("Context Created", !!context, "Context is null");
    addCheck("Safe Root Name", context.safeRootName === "aillame", `Root name mismatch: ${context.safeRootName}`);
    addCheck("Compact Tree size", context.compactTree.length > 0 && context.compactTree.length <= 80, `Invalid tree size: ${context.compactTree.length}`);
    addCheck("No Absolute Paths in tree", context.compactTree.every(n => !n.path.includes(":") && !n.path.includes("\\")), "Absolute path detected in compact tree");

    // 2. Intent Detection Test
    console.log("- Testing Task Intent Detection...");
    const intentDetector = new TaskIntentDetector();
    
    const intentBug = intentDetector.detect("hata düzelt");
    addCheck("Intent: Bugfix", intentBug.category === "bugfix", `Wrong category for bugfix: ${intentBug.category}`);
    
    const intentUI = intentDetector.detect("arayüz tasarımı");
    addCheck("Intent: UI", intentUI.category === "ui", `Wrong category for UI: ${intentUI.category}`);
    
    const intentSecurity = intentDetector.detect("api key güvenliği");
    addCheck("Intent: Security", intentSecurity.category === "security", `Wrong category for security: ${intentSecurity.category}`);

    // 3. Plan Builder Test
    console.log("- Testing Agent Plan Building...");
    const planBuilder = new AgentPlanBuilder();
    const plan = planBuilder.build(userTask, intentBug, context);
    
    addCheck("Plan Success", plan.success === true, "Plan failed");
    addCheck("Read Only Mode", plan.mode === "read-only-plan", "Mode is not read-only");
    addCheck("Safety: ReadOnly", plan.safety.readOnly === true, "Safety flag readOnly mismatch");
    addCheck("Safety: No Modify", plan.safety.willModifyFiles === false, "Safety flag willModifyFiles mismatch");
    addCheck("Steps count", plan.plan.steps.length >= 3, `Too few steps: ${plan.plan.steps.length}`);
    addCheck("Steps approval", plan.plan.steps.every(s => s.requiresApproval === true), "Step missing approval gate");
    
    // Verify no secrets in plan
    const planStr = JSON.stringify(plan);
    addCheck("No .env in plan content", !planStr.includes(".env\"") || plan.safety.excludedSensitiveFiles.includes(".env"), "Secret sillage check");

  } catch (error: any) {
    console.error("Smoke test failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nFinal Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) {
    process.exit(1);
  }
}

runSmokeTest();
