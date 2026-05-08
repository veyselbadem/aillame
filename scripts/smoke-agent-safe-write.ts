import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PatchApplyEngine } from '../src/core/agent/safe-write/patch-apply-engine';

async function runSmokeTest() {
  console.log("Running Agent Safe Write Smoke Tests...");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aillame-smoke-write-'));
  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    const engine = new PatchApplyEngine();

    // Setup temp project
    const testFilePath = "test-file.ts";
    const initialContent = "export const version = '1.0.0';\nconsole.log('init');";
    await fs.writeFile(path.join(tempDir, testFilePath), initialContent);

    const proposal: any = {
      riskSummary: { overallRisk: "low" },
      testSuggestions: ["npm test"],
      changes: [
        {
          relativePath: testFilePath,
          changeType: "replace-block",
          beforeSnippet: "version = '1.0.0'",
          afterSnippet: "version = '1.1.0'",
          title: "Update version"
        }
      ],
      safety: { warnings: [], blockedSensitiveFiles: [] },
      task: { category: "bugfix", original: "version up" },
      workspace: { warnings: [] }
    };

    // 1. Approval Gate Test
    console.log("- Testing approval gate...");
    try {
      await engine.apply({ workspacePath: tempDir, proposal, approval: { approved: false } });
      addCheck("Block unapproved", false, "Allowed write without approval");
    } catch (e: any) {
      addCheck("Block unapproved", e.message.includes("APPROVAL_REQUIRED"), "Correctly blocked unapproved");
    }

    // 2. Dry Run Test
    console.log("- Testing dry run...");
    const dryResult = await engine.apply({
      workspacePath: tempDir,
      proposal,
      approval: { approved: true, approvalText: "Safe dry run test" },
      options: { dryRun: true }
    });
    addCheck("Dry run success", dryResult.success === true, "Dry run failed");
    addCheck("Dry run didn't write", (await fs.readFile(path.join(tempDir, testFilePath), 'utf-8')) === initialContent, "Dry run modified file!");
    addCheck("Dry run token issued", typeof dryResult.dryRunToken === "string" && dryResult.dryRunToken.length > 10, "Dry run token missing");

    // 3. Safe Write Test
    console.log("- Testing actual safe write...");
    try {
      await engine.apply({
        workspacePath: tempDir,
        proposal,
        approval: { approved: true, approvalText: "Safe actual write test" },
        options: { dryRun: false, createBackup: true }
      });
      addCheck("Block write without dry-run token", false, "Allowed write without dry-run token");
    } catch (e: any) {
      addCheck("Block write without dry-run token", e.message.includes("DRY_RUN_REQUIRED"), "Missing dry-run token should be blocked");
    }

    const writeResult = await engine.apply({
      workspacePath: tempDir,
      proposal,
      approval: { approved: true, approvalText: "Safe actual write test", dryRunToken: dryResult.dryRunToken },
      options: { dryRun: false, createBackup: true }
    });
    addCheck("Write success", writeResult.success === true, "Actual write failed");
    const finalContent = await fs.readFile(path.join(tempDir, testFilePath), 'utf-8');
    addCheck("File modified", finalContent.includes("version = '1.1.0'"), "File content mismatch after write");
    addCheck("Backup created", writeResult.backups.length > 0, "Backup missing");

    // 4. Content Mismatch Test
    console.log("- Testing content mismatch protection...");
    const badProposal = { ...proposal, changes: [{ ...proposal.changes[0], beforeSnippet: "non-existent" }] };
    const badDryResult = await engine.apply({
      workspacePath: tempDir,
      proposal: badProposal,
      approval: { approved: true, approvalText: "Mismatch dry run" },
      options: { dryRun: true }
    });
    const mismatchResult = await engine.apply({
      workspacePath: tempDir,
      proposal: badProposal,
      approval: { approved: true, approvalText: "Mismatch test", dryRunToken: badDryResult.dryRunToken }
    });
    addCheck("Mismatch handled", mismatchResult.skippedChanges.some(s => s.reason.includes("CONTENT_MISMATCH")), "Failed to detect content mismatch");

    // 5. Security Block Test
    console.log("- Testing security: .env blocking...");
    await fs.writeFile(path.join(tempDir, ".env"), "SECRET=true");
    const envProposal = { ...proposal, changes: [{ ...proposal.changes[0], relativePath: ".env" }] };
    const envResult = await engine.apply({
      workspacePath: tempDir,
      proposal: envProposal,
      approval: { approved: true, approvalText: "Security test" },
      options: { dryRun: true }
    });
    addCheck("Block .env write", envResult.skippedChanges.some(s => s.reason.includes("Policy block") || s.reason.includes("blocked")), "Failed to block .env write");

    const traversalProposal = { ...proposal, changes: [{ ...proposal.changes[0], relativePath: "../escape.ts" }] };
    const traversalResult = await engine.apply({
      workspacePath: tempDir,
      proposal: traversalProposal,
      approval: { approved: true, approvalText: "Traversal test" },
      options: { dryRun: true }
    });
    addCheck("Block traversal write", traversalResult.skippedChanges.some(s => s.reason.includes("UNSAFE_PATH") || s.reason.includes("Policy block")), "Failed to block traversal path");

  } catch (error: any) {
    console.error("Smoke test failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  } finally {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  console.log("\nFinal Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) process.exit(1);
}

runSmokeTest();
