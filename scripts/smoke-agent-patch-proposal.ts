import { WorkspaceScanner } from '../src/core/agent/workspace-scanner/workspace-scanner';
import { WorkspaceContextBuilder } from '../src/core/agent/planner/workspace-context-builder';
import { TaskIntentDetector } from '../src/core/agent/planner/task-intent-detector';
import { AgentPlanBuilder } from '../src/core/agent/planner/agent-plan-builder';
import { DeepContextBuilder } from '../src/core/agent/file-reader/deep-context-builder';
import { PatchProposalBuilder } from '../src/core/agent/patch-proposal/patch-proposal-builder';

async function runSmokeTest() {
  console.log("Running Agent Patch Proposal Smoke Tests...");

  const workspacePath = process.cwd();
  const userTask = "UI metinlerini Türkçeleştir";
  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    // 1. Full Chain Integration Test (Serverless)
    console.log("- Testing full analysis chain to proposal...");
    
    const scanner = new WorkspaceScanner();
    const scanSummary = await scanner.scan({ workspacePath, maxDepth: 1 });
    
    const context = new WorkspaceContextBuilder().build(scanSummary);
    const intent = new TaskIntentDetector().detect(userTask);
    const plan = new AgentPlanBuilder().build(userTask, intent, context);
    
    const deepBuilder = new DeepContextBuilder();
    const deepContext = await deepBuilder.build(plan, workspacePath);

    const proposalBuilder = new PatchProposalBuilder();
    const proposal = proposalBuilder.build(deepContext);

    addCheck("Proposal Success", proposal.success === true, "Proposal generation failed");
    addCheck("Read Only Mode", proposal.mode === "proposal-only", "Mode mismatch");
    addCheck("Safety: No Modify", proposal.willModifyFiles === false, "Safety flag willModifyFiles mismatch");
    addCheck("Safety: No Commands", proposal.willRunCommands === false, "Safety flag willRunCommands mismatch");
    addCheck("Approval Required", proposal.requiresHumanApproval === true, "Human approval gate missing");
    
    addCheck("Targets Found", proposal.targets.length > 0, "No patch targets identified");
    addCheck("Changes Generated", proposal.changes.length > 0, "No changes suggested");
    
    if (proposal.changes.length > 0) {
      const firstChange = proposal.changes[0];
      addCheck("Unified Diff Structure", firstChange.unifiedDiff?.startsWith("--- a/"), "Invalid diff format");
      addCheck("No Absolute Path in Diff", !firstChange.unifiedDiff?.match(/[a-zA-Z]:[\\\/]/), "Leaked absolute path in diff");
    }

    // 2. Security Check: .env blocking
    console.log("- Testing security: .env targeting...");
    const unsafeContext = { ...deepContext, selectedFiles: [{ relativePath: ".env", contentPreview: "SECRET=123", extension: ".env", sizeBytes: 10, truncated: false, redacted: true, language: "Env", purpose: "Config", structure: {}, warnings: [] }] };
    const unsafeProposal = proposalBuilder.build(unsafeContext as any);
    addCheck("Block .env patch", unsafeProposal.targets.every(t => t.relativePath !== ".env"), "SECURITY_FAILURE: Allowed patching .env!");

    // 3. Risk Analysis
    console.log("- Testing Risk Analysis...");
    addCheck("Risk Summary exists", !!proposal.riskSummary.overallRisk, "Missing risk summary");
    addCheck("Risk Reasons exists", proposal.riskSummary.reasons.length > 0, "Missing risk reasons");

  } catch (error: any) {
    console.error("Smoke test failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nFinal Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) process.exit(1);
}

runSmokeTest();
