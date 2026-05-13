import assert from "node:assert/strict";
import {
  containsDisallowedClaimPhrase,
  DISALLOWED_CLAIM_PHRASES,
} from "../src/core/nano/grounded-response-style";
import {
  detectManualContextConflicts,
  getManualContextConflictGuidance,
} from "../src/core/nano/manual-context-conflict-policy";
import { buildNanoSystemPrompt } from "../src/core/nano/system-prompt";
import type { NanoTaskAnalysis } from "../src/core/nano/types";
import { isNanoNoToolMode, shouldForwardProviderMessages } from "../src/core/orchestrator";

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
    name: "no manual context => conflict guidance empty",
    run: () => {
      const detected = detectManualContextConflicts("Merhaba");
      assert.equal(detected.hasManualContext, false);
      assert.equal(detected.hasPotentialConflict, false);
      assert.equal(getManualContextConflictGuidance("Merhaba"), "");
    },
  },
  {
    name: "single snippet => no conflict",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: feature enabled and request success",
        "Referans: workspace | satir 1-10",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const detected = detectManualContextConflicts(msg);
      assert.equal(detected.hasManualContext, true);
      assert.equal(detected.hasMultipleContextItems, false);
      assert.equal(detected.hasPotentialConflict, false);
    },
  },
  {
    name: "multiple snippets with opposite values => conflict true",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: feature enabled and status success",
        "Referans: workspace | satir 1-8",
        "2. b.ts",
        "Alinti: feature disabled and status failed",
        "Referans: workspace | satir 40-50",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const detected = detectManualContextConflicts(msg);
      assert.equal(detected.hasMultipleContextItems, true);
      assert.equal(detected.hasPotentialConflict, true);
      assert.equal(detected.conflictSignals.includes("opposite_status_enabled_disabled"), true);
      assert.equal(detected.conflictSignals.includes("opposite_status_success_failed"), true);
    },
  },
  {
    name: "true/false and allowed/blocked signals are detected",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. c.ts",
        "Alinti: access true and allowed",
        "2. d.ts",
        "Alinti: access false and blocked",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const detected = detectManualContextConflicts(msg);
      assert.equal(detected.conflictSignals.includes("opposite_status_true_false"), true);
      assert.equal(detected.conflictSignals.includes("opposite_status_allowed_blocked"), true);
    },
  },
  {
    name: "reference mismatch safe reason is produced",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: enabled",
        "Referans: workspace | satir 1-2",
        "2. b.ts",
        "Alinti: disabled",
        "Referans: workspace | satir 90-99",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const detected = detectManualContextConflicts(msg);
      assert.equal(detected.safeReasonCodes.includes("reference_mismatch_possible"), true);
    },
  },
  {
    name: "user request mismatch sets needsClarification",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: feature disabled",
        "[/Workspace Context - Manuel Eklenen]",
        "Bunu enable et ve aynen kalsın.",
      ].join("\n");
      const detected = detectManualContextConflicts(msg);
      assert.equal(detected.conflictSignals.includes("user_request_context_mismatch"), true);
      assert.equal(detected.needsClarification, true);
    },
  },
  {
    name: "guidance avoids forbidden claims",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: enabled",
        "2. b.ts",
        "Alinti: disabled",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const guidance = getManualContextConflictGuidance(msg);
      const normalized = guidance.toLocaleLowerCase("tr-TR");
      for (const phrase of DISALLOWED_CLAIM_PHRASES) {
        assert.equal(normalized.includes(phrase), false);
      }
      assert.equal(containsDisallowedClaimPhrase(guidance), false);
      assert.equal(normalized.includes("rag sonucuna göre"), false);
    },
  },
  {
    name: "raw context is not returned by detection payload",
    run: () => {
      const detected = detectManualContextConflicts(
        "[Workspace Context - Manuel Eklenen]\nAlinti: x\n[/Workspace Context - Manuel Eklenen]"
      ) as unknown as Record<string, unknown>;
      const keys = Object.keys(detected);
      assert.equal(keys.includes("rawContextBlock"), false);
      assert.equal(keys.includes("rawUserMessage"), false);
      assert.equal(keys.includes("fullPath"), false);
      assert.equal(keys.includes("canonicalPath"), false);
    },
  },
  {
    name: "system prompt includes conflict guidance without metadata injection",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: enabled",
        "2. b.ts",
        "Alinti: disabled",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const prompt = buildNanoSystemPrompt({
        analysis: analysis(),
        knowledge: [],
        memoryContext: [],
        profile: "balanced",
        userPrompt: msg,
      });
      const normalized = prompt.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("görünür manuel context içinde çelişki/uyuşmazlık"), true);
      assert.equal(normalized.includes("manualcontextitemcount"), false);
      assert.equal(normalized.includes("staged context"), false);
    },
  },
  {
    name: "nano remains no-tool mode and no provider message forwarding",
    run: () => {
      assert.equal(isNanoNoToolMode("nano"), true);
      assert.equal(shouldForwardProviderMessages("nano"), false);
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

console.log("Phase 37 nano context conflict smoke checks passed.");
