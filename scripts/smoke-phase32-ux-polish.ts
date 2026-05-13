import assert from "node:assert/strict";
import {
  createManualContextUXState,
  getContextDisplaySummary,
} from "../src/core/chat/manual-context-ux-state";
import {
  getSafeWarningCopy,
  getWarningIcon,
  shouldShowWarning,
} from "../src/core/chat/manual-context-warning-copy";
import type { StagedContextState } from "../src/core/indexing/staged-context-types";
import type { ManualContextBoundaryMetadata } from "../src/core/indexing/manual-context-boundary";
import type { ChatMessageAuditResult } from "../src/core/chat/message-audit-types";

function stagedState(count: number): StagedContextState {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      stagedId: `s${i}`,
      resultId: `r${i}`,
      fileId: `f${i}`,
      displayName: `file${i}.ts`,
      extension: "ts",
      snippet: "code",
      citation: { displayName: "file" + i, sourceType: "workspace_search" },
      addedAt: Date.now(),
      sourceType: "workspace_search" as const,
    })),
    totalChars: count * 100,
    warnings: [],
    summaryPreview: `${count} items`,
  };
}

function boundaryOk(): ManualContextBoundaryMetadata {
  return {
    isPresent: true,
    startIndex: 0,
    endIndex: 100,
    blockText: "test",
    itemCount: 3,
    approximateCharCount: 150,
    warnings: [],
  };
}

function boundaryBad(): ManualContextBoundaryMetadata {
  return {
    isPresent: true,
    startIndex: 0,
    endIndex: 100,
    blockText: "test",
    itemCount: 3,
    approximateCharCount: 150,
    warnings: [
      {
        type: "unterminated_block",
        message: "Block incomplete",
      },
    ],
  };
}

function auditOk(): ChatMessageAuditResult {
  return {
    isValid: true,
    hasManualContext: true,
    isBoundaryIntact: true,
    approximateCharCount: 150,
    warnings: [],
    safeToSend: true,
  };
}

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "ux state no staged no draft",
    run: () => {
      const state = createManualContextUXState(null, boundaryOk(), auditOk());
      assert.equal(state.stagedItemCount, 0);
      assert.equal(state.draftHasManualContext, true);
      assert.equal(state.canAttachToDraft, false);
    },
  },
  {
    name: "ux state with staged items",
    run: () => {
      const state = createManualContextUXState(stagedState(3), boundaryOk(), auditOk());
      assert.equal(state.stagedItemCount, 3);
      assert.ok(state.attachButtonLabel.includes("Taslağa Ekle"));
      assert.ok(state.attachButtonLabel.includes("3"));
    },
  },
  {
    name: "ux state can remove when draft ok",
    run: () => {
      const state = createManualContextUXState(null, boundaryOk(), auditOk());
      assert.equal(state.canRemoveFromDraft, true);
      assert.equal(state.removeButtonLabel, "Kaldır");
    },
  },
  {
    name: "ux state cannot remove when boundary bad",
    run: () => {
      const state = createManualContextUXState(null, boundaryBad(), auditOk());
      assert.equal(state.canRemoveFromDraft, false);
    },
  },
  {
    name: "context display summary",
    run: () => {
      const state = createManualContextUXState(null, boundaryOk(), auditOk());
      const summary = getContextDisplaySummary(state);
      assert.ok(summary.title.includes("Manuel"));
      assert.ok(summary.items.length > 0);
    },
  },
  {
    name: "safe warning copy unterminated",
    run: () => {
      const warning = { type: "unterminated_block" as const, message: "test" };
      const copy = getSafeWarningCopy(warning);
      assert.ok(copy.includes("tamamlanmamış"));
      assert.equal(copy.includes("rawBlock"), false);
      assert.equal(copy.includes("secret"), false);
    },
  },
  {
    name: "safe warning copy path pattern",
    run: () => {
      const warning = { type: "path_pattern" as const, message: "test" };
      const copy = getSafeWarningCopy(warning);
      assert.ok(copy.includes("Path"));
      assert.equal(copy.includes("/Users/"), false);
      assert.equal(copy.includes("C:\\"), false);
    },
  },
  {
    name: "warning icon severity",
    run: () => {
      const warning = { severity: "alert" as const, code: "test", message: "test", createdAt: Date.now() };
      const icon = getWarningIcon(warning);
      assert.equal(icon, "🔴");
    },
  },
  {
    name: "should show warning not info",
    run: () => {
      const infoWarning = { severity: "info" as const, code: "test", message: "test", createdAt: Date.now() };
      const alertWarning = { severity: "alert" as const, code: "test", message: "test", createdAt: Date.now() };
      assert.equal(shouldShowWarning(infoWarning), false);
      assert.equal(shouldShowWarning(alertWarning), true);
    },
  },
  {
    name: "ux state no raw content leak",
    run: () => {
      const state = createManualContextUXState(stagedState(2), boundaryOk(), auditOk());
      const json = JSON.stringify(state);
      assert.equal(json.includes("[Workspace Context"), false);
      assert.equal(json.includes("rawBlock"), false);
      assert.equal(json.includes("secret"), false);
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

console.log("Phase 32 manual context UX polish smoke checks passed.");
