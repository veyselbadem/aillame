import assert from "node:assert/strict";
import {
  detectManualContextBoundary,
  isManualContextBoundaryValid,
  getManualContextBoundaryUserMessage,
  MANUAL_CONTEXT_START_MARKER,
  MANUAL_CONTEXT_END_MARKER,
} from "../src/core/indexing/manual-context-boundary";

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "no context block -> isPresent false",
    run: () => {
      const meta = detectManualContextBoundary("hello world");
      assert.equal(meta.isPresent, false);
      assert.equal(meta.startIndex, -1);
      assert.equal(meta.endIndex, -1);
    },
  },
  {
    name: "complete context block detected",
    run: () => {
      const text = `[Workspace Context - Manuel Eklenen]
1. file.ts
Alinti: const x = 1;
Referans: workspace | satir 1-5
[/Workspace Context - Manuel Eklenen]`;
      const meta = detectManualContextBoundary(text);
      assert.equal(meta.isPresent, true);
      assert.ok(meta.startIndex >= 0);
      assert.ok(meta.endIndex > meta.startIndex);
      assert.ok(meta.blockText.includes("[Workspace Context - Manuel Eklenen]"));
      assert.ok(meta.blockText.includes("[/Workspace Context - Manuel Eklenen]"));
    },
  },
  {
    name: "unterminated block detected",
    run: () => {
      const text = `[Workspace Context - Manuel Eklenen]
1. file.ts
Alinti: const x = 1;`;
      const meta = detectManualContextBoundary(text);
      assert.equal(meta.isPresent, true);
      assert.equal(meta.endIndex, -1);
      assert.ok(meta.warnings.some((w) => w.type === "unterminated_block"));
    },
  },
  {
    name: "item count calculated",
    run: () => {
      const text = `[Workspace Context - Manuel Eklenen]
1. file1.ts
Alinti: const a = 1;
Referans: ws | satir 1-5

2. file2.ts
Alinti: const b = 2;
Referans: ws | satir 6-10

3. file3.ts
Alinti: const c = 3;
Referans: ws | satir 11-15
[/Workspace Context - Manuel Eklenen]`;
      const meta = detectManualContextBoundary(text);
      assert.ok(meta.itemCount >= 3);
    },
  },
  {
    name: "path pattern detection",
    run: () => {
      const text = `[Workspace Context - Manuel Eklenen]
1. C:\\Users\\secret\\project\\file.ts
Alinti: const x = 1;
Referans: ws | satir 1-5
[/Workspace Context - Manuel Eklenen]`;
      const meta = detectManualContextBoundary(text);
      assert.ok(meta.warnings.some((w) => w.type === "path_pattern"));
    },
  },
  {
    name: "secret pattern detection",
    run: () => {
      const text = `[Workspace Context - Manuel Eklenen]
1. api.ts
Alinti: const token = "secret_api_key_xyz";
Referans: ws | satir 1-5
[/Workspace Context - Manuel Eklenen]`;
      const meta = detectManualContextBoundary(text);
      assert.ok(meta.warnings.some((w) => w.type === "secret_pattern"));
    },
  },
  {
    name: "size warning for large blocks",
    run: () => {
      let text = `[Workspace Context - Manuel Eklenen]\n`;
      for (let i = 0; i < 100; i++) {
        text += `${i + 1}. file${i}.ts\nAlinti: ${"x".repeat(50)}\nReferans: ws | satir 1-5\n`;
      }
      text += `[/Workspace Context - Manuel Eklenen]`;
      const meta = detectManualContextBoundary(text);
      assert.ok(meta.approximateCharCount > 2000);
      assert.ok(meta.warnings.some((w) => w.type === "size_large"));
    },
  },
  {
    name: "isManualContextBoundaryValid checks",
    run: () => {
      const noContext = detectManualContextBoundary("hello");
      assert.equal(isManualContextBoundaryValid(noContext), false);

      const validContext = detectManualContextBoundary(
        `[Workspace Context - Manuel Eklenen]
1. file.ts
Alinti: x
Referans: ws | satir 1-1
[/Workspace Context - Manuel Eklenen]`
      );
      assert.equal(isManualContextBoundaryValid(validContext), true);

      const unterminated = detectManualContextBoundary(
        `[Workspace Context - Manuel Eklenen]\n1. file.ts`
      );
      assert.equal(isManualContextBoundaryValid(unterminated), false);
    },
  },
  {
    name: "user message generation",
    run: () => {
      const meta = detectManualContextBoundary(
        `[Workspace Context - Manuel Eklenen]
1. file.ts
Alinti: x
Referans: ws | satir 1-1
[/Workspace Context - Manuel Eklenen]`
      );
      const msg = getManualContextBoundaryUserMessage(meta);
      assert.ok(msg.length > 0);
      assert.ok(msg.includes("workspace context"));
      assert.ok(msg.includes("görünür metin"));
      assert.ok(msg.includes("Otomatik dosya okuma"));
    },
  },
  {
    name: "no message for non-existent context",
    run: () => {
      const meta = detectManualContextBoundary("hello world");
      const msg = getManualContextBoundaryUserMessage(meta);
      assert.equal(msg, "");
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

console.log("Phase 28 manual context boundary smoke checks passed.");
