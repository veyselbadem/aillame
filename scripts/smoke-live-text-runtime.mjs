/**
 * Aillame Live Text Runtime Acceptance Smoke Test (Post-Beta Phase 9)
 * Verifies if the local LLM is truly producing text for final production.
 */

import { probeAillameTextRuntime } from '../src/core/engine/rust-core.ts';

async function runAcceptanceTest() {
  console.log("Running Live Text Runtime Acceptance Check...\n");

  const probe = probeAillameTextRuntime();

  console.log("Diagnostics:");
  console.log(`- Success: ${probe.success}`);
  console.log(`- Checkpoint: ${probe.checkpoint.checkpointPathExists ? "FOUND" : "NOT FOUND"}`);
  console.log(`- Generated Tokens: ${probe.generatedTokenCount}`);
  console.log(`- Decoded Length: ${probe.decodedLength}`);
  if (probe.reason) console.log(`- Reason: ${probe.reason}`);
  console.log("");

  const report = {
    liveTextRuntimeAvailable: probe.success,
    finalAcceptanceReady: probe.success,
    selectedRuntime: "nano-rust",
    selectedModelId: "aillame-nano-v1",
    checkpointPath: probe.checkpoint.checkpointPath,
    timestamp: new Date().toISOString(),
    status: probe.success ? "READY" : "NOT_CONFIGURED"
  };

  console.log(JSON.stringify(report, null, 2));

  if (!probe.success) {
    console.warn("\nWARNING: Local Text Generation (LLM) is not ready for final acceptance.");
    console.warn("Please ensure aillame-core-v7.node is compiled and checkpoint exists.");
  } else {
    console.log("\nSUCCESS: Local Text Generation runtime is ready for final acceptance.");
  }

  process.exit(0);
}

runAcceptanceTest().catch(err => {
  console.error("Acceptance check failed:", err);
  process.exit(1);
});
