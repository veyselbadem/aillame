import assert from "node:assert/strict";
import {
  detectVisibleManualContextInUserMessage,
  getVisibleContextResponseGuidance,
} from "../src/core/nano/visible-context-policy";
import {
  isNanoNoToolMode,
  shouldForwardProviderMessages,
} from "../src/core/orchestrator";
import { buildNanoSystemPrompt } from "../src/core/nano/system-prompt";
import type { NanoTaskAnalysis } from "../src/core/nano/types";

function analysis(overrides: Partial<NanoTaskAnalysis> = {}): NanoTaskAnalysis {
  return {
    kind: "coding",
    difficulty: "medium",
    language: "tr",
    riskLevel: "low",
    needsClarification: false,
    needsCurrentInformation: false,
    requiresStepByStepReasoning: true,
    keywords: ["kod"],
    ...overrides,
  };
}

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "manual context marker detected",
    run: () => {
      const msg = "[Workspace Context - Manuel Eklenen]\n1. a.ts\n[/Workspace Context - Manuel Eklenen]";
      const detected = detectVisibleManualContextInUserMessage(msg);
      assert.equal(detected.hasVisibleManualContext, true);
      assert.equal(detected.status, "present_intact");
    },
  },
  {
    name: "no marker message behaves normal",
    run: () => {
      const detected = detectVisibleManualContextInUserMessage("Merhaba");
      assert.equal(detected.hasVisibleManualContext, false);
      assert.equal(detected.status, "none");
    },
  },
  {
    name: "guidance avoids workspace read claims",
    run: () => {
      const msg = "[Workspace Context - Manuel Eklenen]\n1. a.ts\n[/Workspace Context - Manuel Eklenen]";
      const guidance = getVisibleContextResponseGuidance(msg);
      const normalized = guidance.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("dosya okudum"), true);
      assert.equal(normalized.includes("workspace taradım"), true);
      assert.equal(normalized.includes("rag"), true);
      assert.equal(normalized.includes("paylaştığın görünür context'e göre"), true);
    },
  },
  {
    name: "guidance does not leak raw context",
    run: () => {
      const msg = "[Workspace Context - Manuel Eklenen]\nSECRET=abc\n[/Workspace Context - Manuel Eklenen]";
      const guidance = getVisibleContextResponseGuidance(msg);
      assert.equal(guidance.includes("SECRET=abc"), false);
      assert.equal(guidance.includes("[Workspace Context - Manuel Eklenen]"), false);
    },
  },
  {
    name: "nano tier disables tool-rag mode",
    run: () => {
      assert.equal(isNanoNoToolMode("nano"), true);
      assert.equal(isNanoNoToolMode("pro"), false);
    },
  },
  {
    name: "nano tier does not forward provider messages metadata",
    run: () => {
      assert.equal(shouldForwardProviderMessages("nano"), false);
      assert.equal(shouldForwardProviderMessages("pro"), true);
    },
  },
  {
    name: "system prompt includes visible context behavior rule",
    run: () => {
      const prompt = buildNanoSystemPrompt({
        analysis: analysis(),
        knowledge: [],
        memoryContext: [],
        profile: "balanced",
        userPrompt:
          "[Workspace Context - Manuel Eklenen]\n1. app.ts\n[/Workspace Context - Manuel Eklenen]\nBunu açıkla",
      });
      const normalized = prompt.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("paylaştığın görünür context'e göre"), true);
      assert.equal(normalized.includes("dosya okudum"), true);
      assert.equal(normalized.includes("workspace taradım"), true);
      assert.equal(normalized.includes("rag ile buldum"), true);
    },
  },
  {
    name: "system prompt keeps sensitive topic boundary",
    run: () => {
      const prompt = buildNanoSystemPrompt({
        analysis: analysis({ riskLevel: "high", keywords: ["hukuk"] }),
        knowledge: [],
        memoryContext: [],
        profile: "balanced",
        userPrompt: "hukuk konusunda yardım",
      });
      assert.equal(prompt.includes("HASSAS KONU"), true);
      assert.equal(prompt.includes("profesyonel destek"), true);
    },
  },
  {
    name: "guidance marks low context as explicit limitation",
    run: () => {
      const guidance = getVisibleContextResponseGuidance(
        "[Workspace Context - Manuel Eklenen]\n1. a.ts"
      );
      assert.equal(guidance.includes("Eksik bağlam"), true);
      assert.equal(guidance.includes("dosya okuduğunu iddia etme"), true);
    },
  },
  {
    name: "no memory or storage verbs in policy guidance",
    run: () => {
      const guidance = getVisibleContextResponseGuidance("Merhaba");
      assert.equal(guidance.includes("localStorage"), false);
      assert.equal(guidance.includes("sessionStorage"), false);
      assert.equal(guidance.includes("disk"), false);
      assert.equal(guidance.includes("memory'ye yaz"), false);
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

console.log("Phase 33 nano visible manual context smoke checks passed.");
