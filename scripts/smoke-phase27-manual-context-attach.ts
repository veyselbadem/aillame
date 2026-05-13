import assert from "node:assert/strict";
import { createManualContextBlock } from "../src/core/indexing/manual-context-attach";
import { STAGED_CONTEXT_LIMITS, StagedContextItem } from "../src/core/indexing/staged-context-types";

function staged(overrides: Partial<StagedContextItem> = {}): StagedContextItem {
  return {
    stagedId: overrides.stagedId || "s-1",
    resultId: overrides.resultId || "r-1",
    fileId: overrides.fileId || "f-1",
    chunkId: overrides.chunkId,
    displayName: overrides.displayName || "safe.ts",
    extension: overrides.extension || ".ts",
    snippet: overrides.snippet || "const password = token;",
    citation: overrides.citation || {
      fileId: "f-1",
      displayName: "safe.ts",
      rootLabel: "workspace",
      startLine: 1,
      endLine: 5,
    },
    addedAt: overrides.addedAt || Date.now(),
    sourceType: "workspace_search",
  };
}

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "empty staged -> warning",
    run: () => {
      const out = createManualContextBlock({ stagedItems: [] });
      assert.equal(out.block, null);
      assert.equal(out.text, "");
      assert.ok(out.warnings.some((w) => w.code === "no_items"));
    },
  },
  {
    name: "safe block generated",
    run: () => {
      const out = createManualContextBlock({ stagedItems: [staged()] });
      assert.ok(out.block);
      assert.ok(out.text.includes("[Workspace Context - Manuel Eklenen]"));
      assert.ok(out.text.includes("1. safe.ts"));
    },
  },
  {
    name: "path not leaked in output",
    run: () => {
      const out = createManualContextBlock({
        stagedItems: [
          staged({
            displayName: "C:\\Users\\private\\project\\secret.ts",
            snippet: "C:\\Users\\private\\project\\token",
            citation: {
              fileId: "f-1",
              displayName: "C:\\Users\\private\\project\\secret.ts",
              rootLabel: "C:\\Users\\private\\project",
              startLine: 1,
              endLine: 1,
            },
          }),
        ],
      });
      assert.ok(out.text.length > 0);
      assert.equal(out.text.includes("C:\\Users\\private"), false);
    },
  },
  {
    name: "secret masked",
    run: () => {
      const out = createManualContextBlock({
        stagedItems: [staged({ snippet: "Bearer abc.def token=xyz password=123" })],
      });
      assert.ok(out.text.includes("[REDACTED_SECRET]"));
    },
  },
  {
    name: "total chars limit",
    run: () => {
      const many = Array.from({ length: STAGED_CONTEXT_LIMITS.maxItems }, (_, i) =>
        staged({
          stagedId: `s-${i}`,
          resultId: `r-${i}`,
          fileId: `f-${i}`,
          displayName: `file-${i}.ts`,
          snippet: "x".repeat(500),
        })
      );
      const out = createManualContextBlock({ stagedItems: many });
      assert.ok(out.text.length <= 1420);
      assert.ok(out.warnings.some((w) => w.code === "total_chars_trimmed" || w.code === "item_limit_reached"));
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

console.log("Phase 27 manual context attach smoke checks passed.");
