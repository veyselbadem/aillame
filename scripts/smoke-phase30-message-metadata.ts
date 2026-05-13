import assert from "node:assert/strict";
import {
  createMessageUiMetadata,
  createManualContextMetadata,
  generateContextMetadataLabel,
  isMetadataClean,
  getMetadataSafeLogMessage,
} from "../src/core/chat/message-metadata";
import type { ChatMessageAuditResult } from "../src/core/chat/message-audit";

function auditResult(overrides: Partial<ChatMessageAuditResult> = {}): ChatMessageAuditResult {
  return {
    isValid: true,
    hasManualContext: false,
    isBoundaryIntact: true,
    approximateCharCount: 0,
    warnings: [],
    safeToSend: true,
    ...overrides,
  };
}

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "no context -> metadata clean",
    run: () => {
      const result = auditResult();
      const meta = createMessageUiMetadata(result);
      assert.equal(meta.hasManualWorkspaceContext, false);
      assert.ok(isMetadataClean(meta as Record<string, unknown>));
    },
  },
  {
    name: "with context -> hasManualWorkspaceContext true",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
        isBoundaryIntact: true,
        approximateCharCount: 150,
        warnings: [
          {
            severity: "info",
            code: "manual_context_boundary_ok",
            message: "OK",
            createdAt: Date.now(),
          },
        ],
      });
      const meta = createMessageUiMetadata(result);
      assert.equal(meta.hasManualWorkspaceContext, true);
      assert.equal(meta.manualContextBoundaryValid, true);
    },
  },
  {
    name: "metadata item count safe",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
        warnings: [
          { severity: "info", code: "context_item_1", message: "x", createdAt: Date.now() },
          { severity: "info", code: "context_item_2", message: "x", createdAt: Date.now() },
          { severity: "info", code: "context_item_3", message: "x", createdAt: Date.now() },
        ],
      });
      const meta = createMessageUiMetadata(result);
      assert.ok(meta.manualContextItemCount !== undefined);
      assert.ok(meta.manualContextItemCount <= 99);
    },
  },
  {
    name: "metadata no forbidden keys",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
      });
      const meta = createMessageUiMetadata(result);
      const keys = Object.keys(meta);
      const forbidden = ["fullPath", "canonicalPath", "rawContent", "rawMessage", "secret", "token"];
      const hasForbidden = keys.some((k) => forbidden.includes(k));
      assert.equal(hasForbidden, false);
    },
  },
  {
    name: "manual context metadata null when no context",
    run: () => {
      const result = auditResult({ hasManualContext: false });
      const meta = createManualContextMetadata(result);
      assert.equal(meta, null);
    },
  },
  {
    name: "manual context metadata ok when context present",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
        isBoundaryIntact: true,
        approximateCharCount: 200,
      });
      const meta = createManualContextMetadata(result);
      assert.ok(meta);
      assert.equal(meta.source, "manual_workspace_context");
      assert.equal(meta.boundaryStatus, "intact");
    },
  },
  {
    name: "context label generated",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
        isBoundaryIntact: true,
        warnings: [
          { severity: "info", code: "context_item_1", message: "x", createdAt: Date.now() },
          { severity: "info", code: "context_item_2", message: "x", createdAt: Date.now() },
        ],
      });
      const meta = createMessageUiMetadata(result);
      const label = generateContextMetadataLabel(meta);
      assert.ok(label);
      assert.ok(label.includes("kaynak"));
      assert.equal(label.includes("fullPath"), false);
      assert.equal(label.includes("[Workspace Context"), false);
    },
  },
  {
    name: "boundary compromised label",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
        isBoundaryIntact: false,
        isValid: false,
      });
      const meta = createMessageUiMetadata(result);
      const label = generateContextMetadataLabel(meta);
      assert.ok(label);
      assert.ok(label.includes("⚠️"));
    },
  },
  {
    name: "safe log message",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
      });
      const meta = createMessageUiMetadata(result);
      const logMsg = getMetadataSafeLogMessage(meta);
      assert.ok(logMsg.includes("manual_context=true"));
      assert.equal(logMsg.includes("[Workspace Context"), false);
    },
  },
  {
    name: "no raw context in metadata",
    run: () => {
      const result = auditResult({
        hasManualContext: true,
        approximateCharCount: 500,
      });
      const meta = createMessageUiMetadata(result);
      const jsonStr = JSON.stringify(meta);
      assert.equal(jsonStr.includes("rawMessage"), false);
      assert.equal(jsonStr.includes("[Workspace Context"), false);
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

console.log("Phase 30 message metadata smoke checks passed.");
