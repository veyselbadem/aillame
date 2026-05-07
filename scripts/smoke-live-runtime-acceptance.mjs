/**
 * Combined Aillame Live Runtime Acceptance Smoke Test
 *
 * Reports whether both real local LLM text generation and real local IGM image
 * generation are available through Aillame-controlled runtime/worker paths.
 */

import { getCombinedLiveRuntimeAcceptanceReport } from './live-runtime-acceptance-lib.mjs';

async function main() {
  console.log("Running Combined Live Runtime Acceptance Check...\n");

  const combined = await getCombinedLiveRuntimeAcceptanceReport();

  console.log(JSON.stringify(combined, null, 2));

  if (!combined.overallFinalAcceptanceReady) {
    console.warn("\nWARNING: Live Runtime Acceptance is not complete.");
    console.warn("Both real LLM and real IGM generation must pass before final acceptance is ready.");
  } else {
    console.log("\nSUCCESS: Live Runtime Acceptance is complete.");
  }
}

main().catch((error) => {
  console.error("Combined acceptance check failed:", error);
  process.exit(1);
});
