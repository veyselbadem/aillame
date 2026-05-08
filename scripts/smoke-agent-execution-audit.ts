import { ResultVerifier } from '../src/core/agent/execution-audit/result-verifier';

async function runSmokeTest() {
  console.log("Running Agent Execution Audit Smoke Tests...");

  const workspacePath = process.cwd();
  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    const verifier = new ResultVerifier();

    // 1. Dry Run Audit Test
    console.log("- Testing dry run audit...");
    const dryApplyResult: any = {
      success: true,
      mode: "safe-write",
      dryRun: true,
      applied: false,
      changedFiles: [{ relativePath: "src/app/page.tsx", changeCount: 1 }],
      skippedChanges: [],
      backups: [],
      safety: { wroteFiles: false, ranCommands: false, blockedSensitiveFiles: [], warnings: [] }
    };

    const dryAudit = verifier.verify({ workspacePath, applyResult: dryApplyResult });
    addCheck("Audit Mode", dryAudit.mode === "post-write-audit", "Invalid audit mode");
    addCheck("Status: Dry Run", dryAudit.status === "dry-run-only", "Should be dry-run-only status");
    addCheck("Security: No Commands", dryAudit.ranCommands === false, "Should not have ran commands");

    // 2. Real Apply Audit Test
    console.log("- Testing real apply audit...");
    const realApplyResult: any = {
      success: true,
      mode: "safe-write",
      dryRun: false,
      applied: true,
      changedFiles: [{ relativePath: "src/core/agent/file-reader/agent-file-reader.ts", changeCount: 1, backupId: "bk123" }],
      skippedChanges: [],
      backups: [{ backupId: "bk123", relativePath: "src/core/agent/file-reader/agent-file-reader.ts", created: true }],
      safety: { wroteFiles: true, ranCommands: false, blockedSensitiveFiles: [], warnings: [] }
    };

    const realAudit = verifier.verify({ workspacePath, applyResult: realApplyResult });
    addCheck("Status: Verified", realAudit.status === "verified", "Should be verified status");
    addCheck("Backup Hint exists", realAudit.backups[0].rollbackHint.includes("bk123"), "Backup hint missing or wrong");
    addCheck("Verification Plan exists", realAudit.verificationPlan.suggestedCommands.length > 0, "Verification plan empty");
    
    const hasAgentSmoke = realAudit.verificationPlan.suggestedCommands.some(c => c.command.includes("smoke:workspace-scanner"));
    addCheck("Agent-specific smoke suggestion", hasAgentSmoke, "Should suggest agent smoke test for agent file change");

    // 3. Partial Apply Test
    console.log("- Testing partial apply audit...");
    const partialApplyResult: any = { ...realApplyResult, skippedChanges: [{ relativePath: "locked.ts", reason: "Policy" }] };
    const partialAudit = verifier.verify({ workspacePath, applyResult: partialApplyResult });
    addCheck("Status: Partially Verified", partialAudit.status === "partially-verified", "Should be partially-verified status");

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
