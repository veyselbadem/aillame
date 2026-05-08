import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function runBetaLockTest() {
  console.log("Running Agent Beta-Lock Safety Audit...");

  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    // 1. Structural Checks
    const requiredFiles = [
      'src/app/admin/agent/page.tsx',
      'docs/agent-beta-lock.md',
      'src/core/agent/safe-write/approval-gate.ts',
      'src/core/agent/safe-write/write-policy.ts',
      'src/core/agent/safe-write/backup-store.ts',
      'src/app/api/admin/agent/apply-patch/route.ts'
    ];

    for (const file of requiredFiles) {
      addCheck(`File exists: ${file}`, fs.existsSync(path.join(process.cwd(), file)), `Missing critical file: ${file}`);
    }

    // 2. Security Logic Audit (Source level)
    if (fs.existsSync(path.join(process.cwd(), 'src/core/agent/safe-write/patch-apply-engine.ts'))) {
      const content = fs.readFileSync(path.join(process.cwd(), 'src/core/agent/safe-write/patch-apply-engine.ts'), 'utf8');
      addCheck("Uses ApprovalGate", content.includes("this.approvalGate.validate"), "ApprovalGate not called in engine");
      addCheck("Uses WritePolicy", content.includes("this.writePolicy.isAllowed"), "WritePolicy not called in engine");
      addCheck("Uses BackupStore", content.includes("backupStore.createBackup"), "BackupStore not called in engine");
      addCheck("Respects dryRun", content.includes("if (!result.dryRun)"), "DryRun logic not found in write path");
      addCheck("Requires dry-run proof", content.includes("DryRunProofStore.validate"), "Server-side dry-run proof validation missing");
      addCheck("Issues dry-run token", content.includes("DryRunProofStore.issue"), "Server-side dry-run token issuance missing");
    }

    const applyRoutePath = path.join(process.cwd(), 'src/app/api/admin/agent/apply-patch/route.ts');
    if (fs.existsSync(applyRoutePath)) {
      const routeContent = fs.readFileSync(applyRoutePath, 'utf8');
      addCheck("Apply route: no command execution", !routeContent.includes("exec(") && !routeContent.includes("spawn("), "Apply route should not execute commands");
    }

    // 3. UI Safety Audit
    const uiPath = path.join(process.cwd(), 'src/app/admin/agent/page.tsx');
    if (fs.existsSync(uiPath)) {
      const uiContent = fs.readFileSync(uiPath, 'utf8');
      addCheck("UI: No terminal run button", !uiContent.includes("runTerminal") && !uiContent.includes("execCommand"), "Possible dangerous terminal button found");
      addCheck("UI: Approval text required", uiContent.includes("!approvalText"), "Missing approval text validation in UI");
      addCheck("UI: Dry run before apply", uiContent.includes("isDryRunDone"), "Dry run requirement not found in UI state");
      addCheck("UI: Path masking notice", uiContent.includes("maskelenmiştir"), "Missing path masking disclosure");
    }

    // 4. Git Hygiene & Artifact Safety
    const gitStatus = execSync('git status --short').toString();
    addCheck("Git: .env not staged", !gitStatus.includes(".env"), ".env is tracked by git!");
    addCheck("Git: .aillame-data not staged", !gitStatus.includes(".aillame-data"), ".aillame-data is tracked by git!");
    addCheck("Git: igm-venv not staged", !gitStatus.includes("igm-venv"), "igm-venv is tracked by git!");

    // 5. Package.json Audit
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const smokeScripts = Object.keys(pkg.scripts).filter(s => s.startsWith('smoke:agent-'));
    addCheck("Package: All agent smokes registered", smokeScripts.length >= 7, `Expected at least 7 agent smoke tests, found ${smokeScripts.length}`);

    // 6. Absolute Path check (heuristic)
    const sensitiveFiles = execSync('git ls-files src/app/admin/agent/page.tsx').toString();
    if (sensitiveFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), 'src/app/admin/agent/page.tsx'), 'utf8');
      addCheck("No hardcoded C:\\ path", !content.includes("C:\\\\Users\\\\veyse"), "Found hardcoded absolute path in UI code");
    }

  } catch (error: any) {
    console.error("Beta-lock audit failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nAgent Beta-Lock Final Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) {
    console.error("\n[FAIL] Agent security audit did not pass. Beta-lock cannot be established.");
    process.exit(1);
  } else {
    console.log("\n[SUCCESS] Agent beta-lock safety audit passed. System is BETA-READY.");
  }
}

runBetaLockTest();
