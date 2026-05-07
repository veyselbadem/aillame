/**
 * Aillame Live Text Runtime Acceptance Smoke Test
 *
 * This reporter distinguishes Beta Foundation readiness from real local LLM
 * acceptance. Nano may be probed as advisory infrastructure, but Nano output
 * alone is not counted as final LLM acceptance.
 */

import { getLiveTextAcceptanceReport } from './live-runtime-acceptance-lib.mjs';

async function runAcceptanceTest() {
  console.log("Running Live Text Runtime Acceptance Check...\n");

  const text = getLiveTextAcceptanceReport();

  console.log("Diagnostics:");
  console.log(`- Runtime: ${text.selectedRuntime}`);
  console.log(`- Runtime Binary: ${text.runtimeBinary ?? "not-set"}`);
  console.log(`- Model: ${text.modelPathSanitized ?? "not-set"}`);
  console.log(`- Configured: ${text.configured}`);
  console.log(`- Attempted: ${text.attempted}`);
  console.log(`- Succeeded: ${text.succeeded}`);
  console.log(`- Response Length: ${text.responseLength}`);
  console.log(`- Fallback Used: ${text.fallbackUsed}`);
  console.log(`- Degraded: ${text.degraded}`);
  console.log(`- Reason: ${text.reason}`);
  console.log(`- Nano Advisory Probe: ${text.nanoAdvisoryProbe.available ? "available" : "not-ready"}`);
  console.log("");

  const smokeReport = {
    liveTextRuntimeAvailable: text.liveTextRuntimeAvailable,
    finalAcceptanceReady: text.finalAcceptanceReady,
    configured: text.configured,
    attempted: text.attempted,
    succeeded: text.succeeded,
    selectedRuntime: text.selectedRuntime,
    selectedModelId: text.selectedModelId,
    runtimeBinary: text.runtimeBinary,
    modelPathSanitized: text.modelPathSanitized,
    discoveredModels: text.discoveredModels,
    responseLength: text.responseLength,
    outputPreview: text.outputPreview,
    fallbackUsed: text.fallbackUsed,
    degraded: text.degraded,
    reason: text.reason,
    missingConfig: text.missingConfig,
    missingFiles: text.missingFiles,
    missingWorker: text.missingWorker,
    nextActions: text.nextActions,
    warnings: text.warnings,
    nanoAdvisoryProbe: text.nanoAdvisoryProbe,
    timestamp: new Date().toISOString(),
    status: text.finalAcceptanceReady ? "READY" : "NOT_CONFIGURED"
  };

  console.log(JSON.stringify(smokeReport, null, 2));

  if (!text.finalAcceptanceReady) {
    console.warn("\nWARNING: Real local LLM generation is not ready for final acceptance.");
    console.warn("Nano advisory output, fallback output, degraded output, or placeholder text is not counted.");
  } else {
    console.log("\nSUCCESS: Real local LLM generation passed final acceptance.");
  }

  process.exit(0);
}

runAcceptanceTest().catch(err => {
  console.error("Acceptance check failed:", err);
  process.exit(1);
});
