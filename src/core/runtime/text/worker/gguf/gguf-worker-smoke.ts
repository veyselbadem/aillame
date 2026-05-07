import { checkGgufWorkerReadiness } from "./gguf-worker-readiness";
import { formatGgufWorkerReadinessReport } from "./gguf-worker-report";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function main(): Promise<void> {
  console.log("Starting GGUF Worker Prototype Smoke Test...");

  // Mocking environment for test if needed, but here we just check current state
  const readiness = checkGgufWorkerReadiness();
  const report = formatGgufWorkerReadinessReport(readiness);

  console.log("--- Readiness Result ---");
  console.log(`State: ${readiness.state}`);
  console.log(`Success: ${readiness.success}`);
  
  // Basic logical assertions
  if (readiness.state === "model-path-missing") {
    assert(readiness.blockedReasons.length > 0, "Should have blocked reasons if path is missing");
  }

  console.log("");
  console.log("--- Formatted Report Preview ---");
  console.log(report.join("\n"));
  console.log("");

  console.log("[PASS] GGUF Worker Prototype Smoke Test completed (Dry-run).");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
