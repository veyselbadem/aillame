import { 
  buildApiDiagnosticsEnvelope, 
  safeErrorMessage, 
  createApiDiagnostic,
  createSuccessDiagnostic,
  createEmptyDiagnosticsEnvelope
} from "./api-diagnostics";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function main(): Promise<void> {
  console.log("Starting API Diagnostics Smoke Test...");

  // 1. Test empty envelope
  const empty = createEmptyDiagnosticsEnvelope();
  assert(empty.diagnostics.length === 0, "Empty diagnostics should be empty");
  assert(empty.warnings.length === 0, "Empty warnings should be empty");
  assert(empty.degraded === false, "Empty envelope should not be degraded");
  console.log("[PASS] empty envelope");

  // 2. Test warning envelope
  const warningDiag = createApiDiagnostic({
    code: "TEXT_RUNTIME_DEGRADED",
    severity: "warning",
    message: "High latency detected",
  });
  const warningEnv = buildApiDiagnosticsEnvelope([warningDiag]);
  assert(warningEnv.diagnostics.length === 1, "Should have 1 diagnostic");
  assert(warningEnv.warnings.length === 1, "Should have 1 warning string");
  assert(warningEnv.warnings[0] === "High latency detected", "Warning message mismatch");
  assert(warningEnv.degraded === true, "TEXT_RUNTIME_DEGRADED should trigger degraded flag");
  assert(warningEnv.reasonCodes.includes("TEXT_RUNTIME_DEGRADED"), "Should include reason code");
  console.log("[PASS] warning envelope");

  // 3. Test error envelope
  const errorDiag = createApiDiagnostic({
    code: "MODEL_UNAVAILABLE",
    severity: "error",
    message: "Requested model is disabled",
  });
  const errorEnv = buildApiDiagnosticsEnvelope([errorDiag]);
  assert(errorEnv.diagnostics.length === 1, "Should have 1 diagnostic");
  assert(errorEnv.warnings.length === 0, "Error severity should not be in warnings string array (reserved for severity='warning')");
  assert(errorEnv.degraded === true, "Error severity should trigger degraded flag");
  assert(errorEnv.reasonCodes.includes("MODEL_UNAVAILABLE"), "Should include reason code");
  console.log("[PASS] error envelope");

  // 4. Test safe error message
  const err = new Error("Sample internal failure");
  const msg = safeErrorMessage(err);
  assert(msg === "Sample internal failure", "Should extract error message");
  assert(!msg.includes("Error:"), "Should return just the message string");
  console.log("[PASS] safe error message");

  // 5. Test unknown error fallback
  const unknownErr = { some: "internal", object: true };
  const fallbackMsg = safeErrorMessage(unknownErr);
  assert(fallbackMsg === "An unexpected error occurred.", "Should return fallback message for unknown types");
  console.log("[PASS] unknown error fallback");

  // 6. Stack trace check
  const stackErr = new Error("With stack");
  const stackMsg = safeErrorMessage(stackErr);
  assert(!stackMsg.includes("at "), "safeErrorMessage should not return stack trace");
  console.log("[PASS] stack trace check");

  console.log("[PASS] All API Diagnostics tests completed.");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
