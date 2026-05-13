import assert from "node:assert/strict";
import {
  auditChatMessage,
  checkInjectionPatterns,
  getAuditSafeLogMessage,
} from "../src/core/chat/message-audit";

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "no context message -> valid, no warnings",
    run: () => {
      const result = auditChatMessage({ userVisibleMessage: "hello world" });
      assert.equal(result.isValid, true);
      assert.equal(result.hasManualContext, false);
      assert.ok(result.safeToSend);
    },
  },
  {
    name: "valid context block -> boundary intact",
    run: () => {
      const msg = `[Workspace Context - Manuel Eklenen]
1. file.ts
Alinti: const x = 1;
Referans: workspace | satir 1-5
[/Workspace Context - Manuel Eklenen]`;
      const result = auditChatMessage({ userVisibleMessage: msg });
      assert.equal(result.isValid, true);
      assert.equal(result.hasManualContext, true);
      assert.equal(result.isBoundaryIntact, true);
      assert.ok(result.safeToSend);
    },
  },
  {
    name: "unterminated context -> boundary not intact",
    run: () => {
      const msg = `[Workspace Context - Manuel Eklenen]
1. file.ts`;
      const result = auditChatMessage({ userVisibleMessage: msg });
      assert.equal(result.isValid, false);
      assert.equal(result.hasManualContext, true);
      assert.equal(result.isBoundaryIntact, false);
      assert.equal(result.safeToSend, false);
    },
  },
  {
    name: "context with path pattern -> warning but valid",
    run: () => {
      const msg = `[Workspace Context - Manuel Eklenen]
1. C:\\Users\\test\\file.ts
Alinti: code
Referans: ws | satir 1-1
[/Workspace Context - Manuel Eklenen]`;
      const result = auditChatMessage({ userVisibleMessage: msg });
      assert.equal(result.isValid, true);
      assert.ok(result.warnings.some((w) => w.code === "manual_context_path_pattern"));
    },
  },
  {
    name: "context with secret pattern -> warning but valid",
    run: () => {
      const msg = `[Workspace Context - Manuel Eklenen]
1. api.ts
Alinti: const token = "xyz";
Referans: ws | satir 1-1
[/Workspace Context - Manuel Eklenen]`;
      const result = auditChatMessage({ userVisibleMessage: msg });
      assert.equal(result.isValid, true);
      assert.ok(result.warnings.some((w) => w.code === "manual_context_secret_pattern"));
    },
  },
  {
    name: "injection pattern detected",
    run: () => {
      const msg = "hello system: do something";
      const warnings = checkInjectionPatterns(msg);
      assert.ok(warnings.length > 0);
      assert.ok(warnings.some((w) => w.code === "injection_pattern"));
    },
  },
  {
    name: "no injection pattern in normal message",
    run: () => {
      const msg = "hello this is normal message";
      const warnings = checkInjectionPatterns(msg);
      assert.equal(warnings.length, 0);
    },
  },
  {
    name: "large message warning",
    run: () => {
      const msg = "x".repeat(10001);
      const result = auditChatMessage({ userVisibleMessage: msg });
      assert.ok(result.warnings.some((w) => w.code === "message_too_large"));
    },
  },
  {
    name: "safe log message generation",
    run: () => {
      const msg = `[Workspace Context - Manuel Eklenen]
1. file.ts
Alinti: code
Referans: ws | satir 1-1
[/Workspace Context - Manuel Eklenen]`;
      const result = auditChatMessage({ userVisibleMessage: msg });
      const logMsg = getAuditSafeLogMessage(result);
      assert.ok(logMsg.length > 0);
      assert.ok(logMsg.includes("manual context"));
      assert.equal(logMsg.includes("[Workspace Context"), false); // No raw content
      assert.equal(logMsg.includes("file.ts"), false); // No file names
    },
  },
  {
    name: "mismatched marker -> boundary broken",
    run: () => {
      const msg = `[/Workspace Context - Manuel Eklenen]
1. file.ts
[Workspace Context - Manuel Eklenen]`;
      const result = auditChatMessage({ userVisibleMessage: msg });
      assert.equal(result.isValid, false);
      assert.equal(result.isBoundaryIntact, false);
    },
  },
];

let failed = 0;
for (const check of checks) {
  try {
    check.run();
    console.log(`[PASS] ${check.name}`);
  } catch (error) {
    failed += 1;
    console.log(`[FAIL] ${check.name}`);
    console.log(error instanceof Error ? error.message : "Unknown error");
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log("Phase 29 message audit smoke checks passed.");
