import assert from "node:assert/strict";
import {
  containsDisallowedClaimPhrase,
  DISALLOWED_CLAIM_PHRASES,
} from "../src/core/nano/grounded-response-style";
import {
  detectProfileAwareManualContextStyle,
  getManualContextProfileStyle,
  getProfileAwareManualContextGuidance,
} from "../src/core/nano/manual-context-profile-style";
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

const manualContextMessage = [
  "[Workspace Context - Manuel Eklenen]",
  "1. app.ts",
  "Alinti: const value = calculate(input)",
  "Referans: src/app.ts | satir 10-15",
  "[/Workspace Context - Manuel Eklenen]",
  "Bu kısım için öneri ver",
].join("\n");

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "fast profile creates short guidance",
    run: () => {
      const style = detectProfileAwareManualContextStyle(manualContextMessage, "fast");
      const guidance = getProfileAwareManualContextGuidance(manualContextMessage, "fast");
      assert.equal(style.profile, "fast");
      assert.equal(style.maxSections, 4);
      assert.equal(style.detailLevel, "short");
      assert.equal(style.shouldUseHeadings, false);
      assert.equal(guidance.includes("2-4 kısa madde"), true);
    },
  },
  {
    name: "balanced profile creates medium guidance",
    run: () => {
      const style = detectProfileAwareManualContextStyle(manualContextMessage, "balanced");
      const guidance = getProfileAwareManualContextGuidance(manualContextMessage, "balanced");
      assert.equal(style.profile, "balanced");
      assert.equal(style.maxSections, 5);
      assert.equal(style.detailLevel, "medium");
      assert.equal(style.shouldUseHeadings, true);
      assert.equal(guidance.includes("kısa başlıklar"), true);
    },
  },
  {
    name: "quality profile creates deeper but safe guidance",
    run: () => {
      const style = detectProfileAwareManualContextStyle(manualContextMessage, "quality");
      const guidance = getProfileAwareManualContextGuidance(manualContextMessage, "quality");
      assert.equal(style.profile, "quality");
      assert.equal(style.maxSections, 6);
      assert.equal(style.detailLevel, "deep");
      assert.equal(style.shouldUseHeadings, true);
      assert.equal(guidance.includes("daha kapsamlı"), true);
      assert.equal(guidance.includes("görünür snippet sınırında"), true);
    },
  },
  {
    name: "manual context missing keeps profile style neutral",
    run: () => {
      const style = detectProfileAwareManualContextStyle("Merhaba", "fast");
      const guidance = getProfileAwareManualContextGuidance("Merhaba", "fast");
      assert.equal(style.profile, "fast");
      assert.equal(style.safeLengthGuidance, "");
      assert.equal(style.shouldAskForMoreContext, false);
      assert.equal(guidance, "");
    },
  },
  {
    name: "insufficient context asks for more in all profiles",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: x",
        "[/Workspace Context - Manuel Eklenen]",
        "tüm projeye göre yorumla",
      ].join("\n");

      const fast = detectProfileAwareManualContextStyle(msg, "fast");
      const balanced = detectProfileAwareManualContextStyle(msg, "balanced");
      const quality = detectProfileAwareManualContextStyle(msg, "quality");
      assert.equal(fast.shouldAskForMoreContext, true);
      assert.equal(balanced.shouldAskForMoreContext, true);
      assert.equal(quality.shouldAskForMoreContext, true);
    },
  },
  {
    name: "conflict keeps avoid-definitive behavior in all profiles",
    run: () => {
      const msg = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: feature enabled",
        "2. b.ts",
        "Alinti: feature disabled",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");

      for (const profile of ["fast", "balanced", "quality"] as const) {
        const style = detectProfileAwareManualContextStyle(msg, profile);
        const guidance = getProfileAwareManualContextGuidance(msg, profile).toLocaleLowerCase("tr-TR");
        assert.equal(style.shouldAskForMoreContext, true);
        assert.equal(guidance.includes("kesin hükümden kaçın"), true);
      }
    },
  },
  {
    name: "guidance avoids forbidden claim phrases",
    run: () => {
      const guidance = getProfileAwareManualContextGuidance(manualContextMessage, "quality");
      const normalized = guidance.toLocaleLowerCase("tr-TR");
      for (const phrase of DISALLOWED_CLAIM_PHRASES) {
        assert.equal(normalized.includes(phrase), false);
      }
      assert.equal(containsDisallowedClaimPhrase(guidance), false);
      assert.equal(normalized.includes("rag sonucuna göre"), false);
    },
  },
  {
    name: "style output does not leak raw blocks or paths",
    run: () => {
      const style = detectProfileAwareManualContextStyle(manualContextMessage, "balanced") as unknown as Record<
        string,
        unknown
      >;
      const keys = Object.keys(style);
      assert.equal(keys.includes("rawContextBlock"), false);
      assert.equal(keys.includes("rawUserMessage"), false);
      assert.equal(keys.includes("fullPath"), false);
      assert.equal(keys.includes("canonicalPath"), false);
      assert.equal(keys.includes("physicalPath"), false);
      assert.equal(keys.includes("snippetText"), false);
    },
  },
  {
    name: "profile style mapping helper works safely",
    run: () => {
      const fast = getManualContextProfileStyle("fast");
      const balanced = getManualContextProfileStyle("balanced");
      const quality = getManualContextProfileStyle("quality");
      assert.equal(fast.preferredFormat, "short_bullets");
      assert.equal(balanced.preferredFormat, "compact_headings");
      assert.equal(quality.preferredFormat, "structured_headings");
    },
  },
  {
    name: "system prompt includes profile-aware guidance and no metadata injection",
    run: () => {
      const prompt = buildNanoSystemPrompt({
        analysis: analysis(),
        knowledge: [],
        memoryContext: [],
        profile: "fast",
        userPrompt: manualContextMessage,
      });

      const normalized = prompt.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("profil bazlı uzunluk/yoğunluk"), true);
      assert.equal(normalized.includes("staged context"), false);
      assert.equal(normalized.includes("manualcontextitemcount"), false);
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

console.log("Phase 39 nano profile-aware answer length smoke checks passed.");
