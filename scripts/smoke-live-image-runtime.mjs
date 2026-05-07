/**
 * Aillame Live Image Runtime Acceptance Smoke Test
 *
 * This reporter does not count env-only configuration, dummy files, or
 * placeholder worker responses as final IGM acceptance.
 */

import { getLiveImageAcceptanceReport } from './live-runtime-acceptance-lib.mjs';

async function runAcceptanceTest() {
  console.log("Running Live Image Runtime Acceptance Check...\n");

  const image = await getLiveImageAcceptanceReport();

  console.log("Diagnostics:");
  console.log(`- Configured: ${image.configured}`);
  console.log(`- Attempted: ${image.attempted}`);
  console.log(`- Succeeded: ${image.succeeded}`);
  console.log(`- File Exists: ${image.fileExists}`);
  console.log(`- Placeholder Used: ${image.placeholderUsed}`);
  console.log(`- Degraded: ${image.degraded}`);
  console.log(`- Reason: ${image.reason}`);
  console.log("");

  const smokeReport = {
    liveImageRuntimeAvailable: image.liveImageRuntimeAvailable,
    finalAcceptanceReady: image.finalAcceptanceReady,
    configured: image.configured,
    attempted: image.attempted,
    succeeded: image.succeeded,
    jobId: image.jobId,
    assetId: image.assetId,
    outputPathSanitized: image.outputPathSanitized,
    mimeType: image.mimeType,
    fileExists: image.fileExists,
    placeholderUsed: image.placeholderUsed,
    degraded: image.degraded,
    reason: image.reason,
    missingConfig: image.missingConfig,
    missingFiles: image.missingFiles,
    missingWorker: image.missingWorker,
    nextActions: image.nextActions,
    warnings: image.warnings,
    timestamp: new Date().toISOString(),
    status: image.finalAcceptanceReady ? "READY" : "NOT_CONFIGURED"
  };

  console.log(JSON.stringify(smokeReport, null, 2));

  if (!image.finalAcceptanceReady) {
    console.warn("\nWARNING: Real local IGM generation is not ready for final acceptance.");
    console.warn("Placeholder images, dummy assets, not-configured jobs, and env-only readiness are not counted.");
  } else {
    console.log("\nSUCCESS: Real local IGM generation passed final acceptance.");
  }

  process.exit(0);
}

runAcceptanceTest().catch(err => {
  console.error("Acceptance check failed:", err);
  process.exit(1);
});
