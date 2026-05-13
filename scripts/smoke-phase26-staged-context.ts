import assert from "node:assert/strict";
import {
  applyStageAdd,
  applyStageClearAll,
  applyStageRemoveByResultId,
  applyStageRemoveByStagedId,
  computeStagedTotalChars,
} from "../src/core/indexing/staged-context-state";
import { STAGED_CONTEXT_LIMITS } from "../src/core/indexing/staged-context-types";
import { createSafeStagedItemWithWarnings } from "../src/core/indexing/staged-context-sanitizer";
import { SearchResult } from "../src/core/indexing/search-types";

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    resultId: overrides.resultId || "r-1",
    fileId: overrides.fileId || "f-1",
    chunkId: overrides.chunkId,
    displayName: overrides.displayName || "safe-file.ts",
    rootLabel: overrides.rootLabel || "workspace",
    extension: overrides.extension || ".ts",
    score: overrides.score ?? 0.9,
    snippet: overrides.snippet || "const token = bearer secret-value;",
    startLine: overrides.startLine ?? 1,
    endLine: overrides.endLine ?? 3,
    matchType: overrides.matchType || "content",
    warnings: overrides.warnings,
  };
}

async function run() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  const addCheck = (name: string, fn: () => void) => {
    try {
      fn();
      checks.push({ name, ok: true, detail: "PASS" });
    } catch (error) {
      checks.push({
        name,
        ok: false,
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  addCheck("select result", () => {
    const state = applyStageAdd([], makeResult());
    assert.equal(state.items.length, 1);
    assert.equal(state.added, true);
  });

  addCheck("prevent duplicate selection", () => {
    const first = applyStageAdd([], makeResult({ resultId: "dup-1" }));
    const second = applyStageAdd(first.items, makeResult({ resultId: "dup-1" }));
    assert.equal(second.items.length, 1);
    assert.equal(second.added, false);
    assert.ok(second.warnings.some((w) => w.code === "duplicate_item"));
  });

  addCheck("remove item", () => {
    const first = applyStageAdd([], makeResult({ resultId: "remove-r", fileId: "remove-f" }));
    const stagedId = first.items[0].stagedId;
    const next = applyStageRemoveByStagedId(first.items, stagedId);
    assert.equal(next.length, 0);
  });

  addCheck("clear all", () => {
    const first = applyStageAdd([], makeResult({ resultId: "clear-r", fileId: "clear-f" }));
    const cleared = applyStageClearAll();
    assert.equal(first.items.length, 1);
    assert.equal(cleared.length, 0);
  });

  addCheck("max item limit", () => {
    let items = [] as ReturnType<typeof applyStageAdd>["items"];
    for (let i = 0; i < STAGED_CONTEXT_LIMITS.maxItems; i++) {
      items = applyStageAdd(
        items,
        makeResult({ resultId: `m-${i}`, fileId: `m-f-${i}`, snippet: "ok" })
      ).items;
    }
    const rejected = applyStageAdd(
      items,
      makeResult({ resultId: "m-over", fileId: "m-f-over", snippet: "ok" })
    );
    assert.equal(rejected.items.length, STAGED_CONTEXT_LIMITS.maxItems);
    assert.equal(rejected.added, false);
    assert.ok(rejected.warnings.some((w) => w.code === "max_items"));
  });

  addCheck("max total chars limit", () => {
    let items = [] as ReturnType<typeof applyStageAdd>["items"];
    const longSnippet = "x".repeat(STAGED_CONTEXT_LIMITS.maxSnippetCharsPerItem);
    while (computeStagedTotalChars(items) <= STAGED_CONTEXT_LIMITS.maxTotalChars - STAGED_CONTEXT_LIMITS.maxSnippetCharsPerItem) {
      const idx = items.length;
      items = applyStageAdd(
        items,
        makeResult({ resultId: `chars-${idx}`, fileId: `chars-f-${idx}`, snippet: longSnippet })
      ).items;
    }

    const rejected = applyStageAdd(
      items,
      makeResult({ resultId: "chars-over", fileId: "chars-f-over", snippet: longSnippet })
    );
    assert.equal(rejected.added, false);
    assert.ok(rejected.warnings.some((w) => w.code === "max_total_chars"));
  });

  addCheck("no path fields in staged item", () => {
    const prepared = createSafeStagedItemWithWarnings(makeResult({ resultId: "safe-keys" }));
    assert.ok(prepared.item);
    const item = prepared.item as Record<string, unknown>;
    assert.equal("fullPath" in item, false);
    assert.equal("canonicalPath" in item, false);
  });

  addCheck("secret snippet masked", () => {
    const prepared = createSafeStagedItemWithWarnings(
      makeResult({ resultId: "mask-1", snippet: "password=abc123 token=xyz Bearer abc.def.ghi" })
    );
    assert.ok(prepared.item);
    const snippet = prepared.item?.snippet || "";
    assert.ok(snippet.includes("[REDACTED_SECRET]"));
  });

  addCheck("citation should not expose full path", () => {
    const prepared = createSafeStagedItemWithWarnings(
      makeResult({ resultId: "citation-1", rootLabel: "C:\\Users\\secret\\project", displayName: "C:\\Users\\secret\\project\\src\\a.ts" })
    );
    assert.ok(prepared.item);
    assert.ok(!(prepared.item?.citation.rootLabel.includes("\\") || prepared.item?.citation.rootLabel.includes("/")));
    assert.ok(!(prepared.item?.citation.displayName.includes("\\") || prepared.item?.citation.displayName.includes("/")));
  });

  addCheck("remove by result id", () => {
    const first = applyStageAdd([], makeResult({ resultId: "rid-1", fileId: "rid-f-1" }));
    const second = applyStageAdd(first.items, makeResult({ resultId: "rid-2", fileId: "rid-f-2" }));
    const next = applyStageRemoveByResultId(second.items, "rid-1");
    assert.equal(next.length, 1);
    assert.equal(next[0].resultId, "rid-2");
  });

  addCheck("total chars helper", () => {
    const first = applyStageAdd([], makeResult({ resultId: "len-1", fileId: "len-f-1", snippet: "abc" }));
    const second = applyStageAdd(first.items, makeResult({ resultId: "len-2", fileId: "len-f-2", snippet: "defg" }));
    assert.equal(computeStagedTotalChars(second.items), 7);
  });

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    const mark = check.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${check.name}`);
    if (!check.ok) {
      console.log(`  -> ${check.detail}`);
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
    throw new Error(`Phase 26 smoke checks failed: ${failed.length}`);
  }

  console.log("Phase 26 staged context smoke checks passed.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});
