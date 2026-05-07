/**
 * Aillame Live Image Runtime Acceptance Smoke Test (Post-Beta Phase 8)
 * Verifies if the local IGM runtime is truly ready for final production.
 */

import { IGMRuntimeReadiness } from '../src/core/runtime/image/igm-runtime-readiness.ts';

async function runAcceptanceTest() {
  console.log("Running Live Image Runtime Acceptance Check...\n");

  // Mocking process.env access as the script might run in node environment
  // We'll rely on the IGMRuntimeReadiness which reads env
  const diag = IGMRuntimeReadiness.getDiagnostics();

  console.log("Diagnostics:");
  console.log(`- Enabled: ${diag.enabled}`);
  console.log(`- Model Directory: ${diag.modelDirConfigured ? "Configured" : "NOT SET"}`);
  console.log(`- Active Model: ${diag.activeModelConfigured ? "Configured" : "NOT SET"}`);
  console.log(`- Output Directory: ${diag.outputDirWritable ? "Writable" : "NOT WRITABLE"}`);
  console.log(`- Device: ${diag.device}`);
  console.log("");

  const report = {
    liveImageRuntimeAvailable: diag.enabled && diag.workerAvailable,
    finalAcceptanceReady: diag.finalAcceptanceReady,
    missingConfig: diag.missingConfig,
    timestamp: new Date().toISOString(),
    status: diag.finalAcceptanceReady ? "READY" : "NOT_CONFIGURED"
  };

  console.log(JSON.stringify(report, null, 2));

  if (!diag.finalAcceptanceReady) {
    console.warn("\nWARNING: Local Image Generation (IGM) is not ready for final acceptance.");
    console.warn("Please check .env.example for required AILLAME_IGM_* variables.");
  } else {
    console.log("\nSUCCESS: Local Image Generation runtime is ready for final acceptance.");
  }

  // We don't exit with 1 if not configured, as it's an acceptance reporter
  process.exit(0);
}

runAcceptanceTest().catch(err => {
  console.error("Acceptance check failed:", err);
  process.exit(1);
});
