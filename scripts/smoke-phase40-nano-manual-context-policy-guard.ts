import assert from "node:assert/strict";
import {
  containsDisallowedClaimPhrase,
  DISALLOWED_CLAIM_PHRASES,
} from "../src/core/nano/grounded-response-style";
import {
  evaluateManualContextPolicyGuard,
  getManualContextPolicyGuardSummary,
  getManualContextPolicySafeLog,
} from "../src/core/nano/manual-context-policy-guard";
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
    name: "no manual context returns safe normal guard",
    run: () => {
      const result = evaluateManualContextPolicyGuard("Merhaba", "balanced");
      assert.equal(result.hasManualContext, false);
      assert.equal(result.safePolicyCodes.includes("manual_context_absent"), true);
      assert.equal(getManualContextPolicyGuardSummary("Merhaba", "balanced"), "");
    },
  },
  {
    name: "manual context enables grounded + structure + profile style",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: const value = run(input)",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");

      const result = evaluateManualContextPolicyGuard(msg, "balanced");
      assert.equal(result.hasManualContext, true);
      assert.equal(result.shouldUseGroundedStyle, true);
      assert.equal(result.shouldUseCompactProfileStyle, true);
      assert.equal(result.safePolicyCodes.includes("grounded_style_required"), true);
    },
  },
  {
    name: "reference context activates reference style without file-follow claims",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: const value = compute(data)",
        "Referans: src/app.ts | satir 10-15",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");

      const result = evaluateManualContextPolicyGuard(msg, "balanced");
      const summary = getManualContextPolicyGuardSummary(msg, "balanced").toLocaleLowerCase("tr-TR");
      assert.equal(result.hasReferences, true);
      assert.equal(result.shouldUseReferenceStyle, true);
      assert.equal(summary.includes("görünür referans etiketi"), true);
      assert.equal(summary.includes("referans takibi iddiası"), true);
    },
  },
  {
    name: "reference-only context triggers insufficiency",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Referans: src/a.ts | satir 1-4",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const result = evaluateManualContextPolicyGuard(msg, "balanced");
      assert.equal(result.hasInsufficiency, true);
      assert.equal(result.shouldAskForMoreContext, true);
    },
  },
  {
    name: "very short snippet triggers ask for more context",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. x.ts",
        "Alinti: x",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const result = evaluateManualContextPolicyGuard(msg, "fast");
      assert.equal(result.hasInsufficiency, true);
      assert.equal(result.shouldAskForMoreContext, true);
      assert.equal(result.safePolicyCodes.includes("ask_for_more_context"), true);
    },
  },
  {
    name: "conflicting snippets trigger conflict and definitive-claim avoidance",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: feature enabled",
        "2. b.ts",
        "Alinti: feature disabled",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");

      const result = evaluateManualContextPolicyGuard(msg, "quality");
      assert.equal(result.hasConflict, true);
      assert.equal(result.shouldAvoidDefinitiveClaims, true);
      assert.equal(result.safePolicyCodes.includes("conflict_detected"), true);
      assert.equal(result.safePolicyCodes.includes("avoid_definitive_claims"), true);
    },
  },
  {
    name: "fast profile keeps compact guidance",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. z.ts",
        "Alinti: const v = 1",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");

      const result = evaluateManualContextPolicyGuard(msg, "fast");
      assert.equal(result.profile, "fast");
      assert.equal(result.shouldUseCompactProfileStyle, true);
    },
  },
  {
    name: "quality profile remains structured but snippet-bounded",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. z.ts",
        "Alinti: const v = calculate(input)",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");

      const result = evaluateManualContextPolicyGuard(msg, "quality");
      const summary = getManualContextPolicyGuardSummary(msg, "quality").toLocaleLowerCase("tr-TR");
      assert.equal(result.profile, "quality");
      assert.equal(summary.includes("görünür snippet sınır"), true);
    },
  },
  {
    name: "guard summary avoids disallowed claims",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: const value = run()",
        "Referans: src/app.ts | satir 1-3",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");

      const summary = getManualContextPolicyGuardSummary(msg, "balanced");
      const normalized = summary.toLocaleLowerCase("tr-TR");
      for (const phrase of DISALLOWED_CLAIM_PHRASES) {
        assert.equal(normalized.includes(phrase), false);
      }
      assert.equal(containsDisallowedClaimPhrase(summary), false);
      assert.equal(normalized.includes("rag sonucuna göre"), false);
      assert.equal(normalized.includes("referansı açtım"), false);
    },
  },
  {
    name: "guard result and safe log do not leak raw fields",
    run: () => {
      const result = evaluateManualContextPolicyGuard(
        "[Workspace Context - Manuel Eklenen]\n1. x.ts\nAlinti: y\n[/Workspace Context - Manuel Eklenen]",
        "balanced"
      ) as unknown as Record<string, unknown>;
      const keys = Object.keys(result);
      assert.equal(keys.includes("rawContextBlock"), false);
      assert.equal(keys.includes("rawUserMessage"), false);
      assert.equal(keys.includes("fullPath"), false);
      assert.equal(keys.includes("canonicalPath"), false);
      assert.equal(keys.includes("physicalPath"), false);
      assert.equal(keys.includes("metadataRawPayload"), false);

      const safeLog = getManualContextPolicySafeLog(result as never) as unknown as Record<string, unknown>;
      const safeLogKeys = Object.keys(safeLog);
      assert.equal(safeLogKeys.includes("rawContextBlock"), false);
      assert.equal(safeLogKeys.includes("rawUserMessage"), false);
      assert.equal(safeLogKeys.includes("fullPath"), false);
      assert.equal(safeLogKeys.includes("canonicalPath"), false);
      assert.equal(safeLogKeys.includes("physicalPath"), false);
      assert.equal(safeLogKeys.includes("safePolicyCodes"), true);
    },
  },
  {
    name: "system prompt keeps guard chain without metadata or staged injection",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: const value = run()",
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
      assert.equal(normalized.includes("manual context policy guard"), true);
      assert.equal(normalized.includes("staged context"), false);
      assert.equal(normalized.includes("manualcontextitemcount"), false);
    },
  },
  {
    name: "no search/rag/tools and no provider forwarding",
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

console.log("Phase 40 nano manual context policy guard smoke checks passed.");
