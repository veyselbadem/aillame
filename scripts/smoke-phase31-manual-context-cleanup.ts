import assert from "node:assert/strict";
import {
  removeManualContextFromDraft,
  isCleanupResultSafe,
  getCleanupSafeLogMessage,
  generateCleanupStatusLabel,
} from "../src/core/chat/manual-context-cleanup";

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "no context -> not_found",
    run: () => {
      const result = removeManualContextFromDraft("Merhaba, bu basit bir metindir.");
      assert.equal(result.status, "not_found");
      assert.equal(result.removedBlockCount, 0);
      assert.equal(result.cleanedDraft, "Merhaba, bu basit bir metindir.");
    },
  },
  {
    name: "empty draft -> no_action_needed",
    run: () => {
      const result = removeManualContextFromDraft("");
      assert.equal(result.status, "no_action_needed");
      assert.equal(result.removedBlockCount, 0);
    },
  },
  {
    name: "single context block removed",
    run: () => {
      const draft =
        "User metni burada\n[Workspace Context - Manuel Eklenen]\nContext icerigi\n[/Workspace Context - Manuel Eklenen]\nSonra user metni";
      const result = removeManualContextFromDraft(draft);
      assert.equal(result.status, "removed");
      assert.equal(result.removedBlockCount, 1);
      assert.ok(result.cleanedDraft.includes("User metni burada"));
      assert.ok(result.cleanedDraft.includes("Sonra user metni"));
      assert.ok(!result.cleanedDraft.includes("[Workspace Context"));
      assert.ok(!result.cleanedDraft.includes("Context icerigi"));
    },
  },
  {
    name: "user text preserved outside context",
    run: () => {
      const draft =
        "Before context\n[Workspace Context - Manuel Eklenen]\nBlock\n[/Workspace Context - Manuel Eklenen]\nAfter context";
      const result = removeManualContextFromDraft(draft);
      assert.ok(result.cleanedDraft.includes("Before context"));
      assert.ok(result.cleanedDraft.includes("After context"));
      assert.equal(result.cleanedDraft.split("Before context").length, 2);
      assert.equal(result.cleanedDraft.split("After context").length, 2);
    },
  },
  {
    name: "unterminated block -> invalid_boundary",
    run: () => {
      const draft = "Text\n[Workspace Context - Manuel Eklenen]\nUnclosed block";
      const result = removeManualContextFromDraft(draft);
      assert.equal(result.status, "invalid_boundary");
      assert.equal(result.removedBlockCount, 0);
      assert.equal(result.cleanedDraft, draft);
    },
  },
  {
    name: "mismatched markers -> ambiguous",
    run: () => {
      const draft =
        "[/Workspace Context - Manuel Eklenen]\nContent\n[Workspace Context - Manuel Eklenen]";
      const result = removeManualContextFromDraft(draft);
      assert.equal(result.status, "ambiguous");
      assert.equal(result.removedBlockCount, 0);
    },
  },
  {
    name: "result no forbidden keys",
    run: () => {
      const result = removeManualContextFromDraft(
        "[Workspace Context - Manuel Eklenen]\nTest\n[/Workspace Context - Manuel Eklenen]"
      );
      assert.ok(isCleanupResultSafe(result as Record<string, unknown>));
      const keys = Object.keys(result);
      const forbidden = ["removedRawBlock", "rawContext", "secret", "fullPath"];
      assert.ok(!keys.some((k) => forbidden.includes(k)));
    },
  },
  {
    name: "safe log message",
    run: () => {
      const result = removeManualContextFromDraft(
        "Before\n[Workspace Context - Manuel Eklenen]\nBlock\n[/Workspace Context - Manuel Eklenen]\nAfter"
      );
      const logMsg = getCleanupSafeLogMessage(result);
      assert.ok(logMsg.includes("status=removed"));
      assert.ok(logMsg.includes("removed=1"));
      assert.ok(!logMsg.includes("[Workspace Context"));
      assert.ok(!logMsg.includes("Block"));
    },
  },
  {
    name: "cleanup status label",
    run: () => {
      const result = removeManualContextFromDraft(
        "Text\n[Workspace Context - Manuel Eklenen]\nCtx\n[/Workspace Context - Manuel Eklenen]\nMore"
      );
      const label = generateCleanupStatusLabel(result);
      assert.ok(label);
      assert.ok(label.includes("removed"));
    },
  },
  {
    name: "draft length updated correctly",
    run: () => {
      const draft =
        "Start text here\n[Workspace Context - Manuel Eklenen]\nThis is context content\n[/Workspace Context - Manuel Eklenen]\nEnd text";
      const result = removeManualContextFromDraft(draft);
      assert.equal(result.originalLength, draft.length);
      assert.ok(result.cleanedLength < result.originalLength);
      assert.ok(result.cleanedDraft.length === result.cleanedLength);
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

console.log("Phase 31 manual context cleanup smoke checks passed.");
