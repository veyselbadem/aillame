import assert from "node:assert/strict";
import {
  containsDisallowedClaimPhrase,
  DISALLOWED_CLAIM_PHRASES,
} from "../src/core/nano/grounded-response-style";
import { buildNanoSystemPrompt } from "../src/core/nano/system-prompt";
import type { NanoTaskAnalysis } from "../src/core/nano/types";
import {
  detectVisibleManualContextReferences,
  getVisibleReferenceResponseGuidance,
} from "../src/core/nano/visible-reference-policy";
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

const messageWithReference = [
  "[Workspace Context - Manuel Eklenen]",
  "1. api.ts",
  "Alinti: const x = 1;",
  "Referans: workspace | satir 10-20",
  "[/Workspace Context - Manuel Eklenen]",
].join("\n");

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "manual context reference line is detected",
    run: () => {
      const detected = detectVisibleManualContextReferences(messageWithReference);
      assert.equal(detected.hasVisibleManualContext, true);
      assert.equal(detected.hasReferences, true);
      assert.equal(detected.referenceCount, 1);
      assert.equal(detected.safeReferenceSummaries[0].includes("Görünen referans etiketi"), true);
    },
  },
  {
    name: "no reference line returns safe warning",
    run: () => {
      const detected = detectVisibleManualContextReferences(
        "[Workspace Context - Manuel Eklenen]\n1. a.ts\nAlinti: x\n[/Workspace Context - Manuel Eklenen]"
      );
      assert.equal(detected.hasVisibleManualContext, true);
      assert.equal(detected.hasReferences, false);
      assert.equal(detected.warnings.some((w) => w.type === "reference_missing"), true);
    },
  },
  {
    name: "broken reference is handled as ambiguous",
    run: () => {
      const detected = detectVisibleManualContextReferences(
        "[Workspace Context - Manuel Eklenen]\nReferans:   \n[/Workspace Context - Manuel Eklenen]"
      );
      assert.equal(detected.warnings.some((w) => w.type === "reference_ambiguous"), true);
      assert.equal(detected.safeReferenceSummaries[0].includes("belirsiz"), true);
    },
  },
  {
    name: "path or secret reference does not leak value",
    run: () => {
      const detected = detectVisibleManualContextReferences(
        "[Workspace Context - Manuel Eklenen]\nReferans: C:\\Users\\x\\project\\token=abc\n[/Workspace Context - Manuel Eklenen]"
      );
      const summary = detected.safeReferenceSummaries.join(" ");
      assert.equal(summary.includes("C:\\Users"), false);
      assert.equal(summary.includes("token=abc"), false);
      assert.equal(detected.warnings.some((w) => w.type === "reference_path_pattern"), true);
      assert.equal(detected.warnings.some((w) => w.type === "reference_secret_pattern"), true);
    },
  },
  {
    name: "reference guidance uses visible-reference framing",
    run: () => {
      const guidance = getVisibleReferenceResponseGuidance(messageWithReference);
      assert.equal(guidance.includes("Paylaşılan referans etiketine göre"), true);
      assert.equal(guidance.includes("görünür mesajında paylaşılan referans etiketi"), true);
    },
  },
  {
    name: "reference guidance does not contain claim phrases",
    run: () => {
      const guidance = getVisibleReferenceResponseGuidance(messageWithReference);
      for (const phrase of DISALLOWED_CLAIM_PHRASES) {
        assert.equal(guidance.toLocaleLowerCase("tr-TR").includes(phrase), false);
      }
      assert.equal(containsDisallowedClaimPhrase(guidance), false);
    },
  },
  {
    name: "reference guidance does not mention rag or tool access",
    run: () => {
      const guidance = getVisibleReferenceResponseGuidance(messageWithReference).toLocaleLowerCase("tr-TR");
      assert.equal(guidance.includes("rag ile buldum"), false);
      assert.equal(guidance.includes("referansı açtım"), false);
      assert.equal(guidance.includes("dosya yolunu takip ettim"), false);
    },
  },
  {
    name: "system prompt includes reference guidance and no metadata injection",
    run: () => {
      const prompt = buildNanoSystemPrompt({
        analysis: analysis(),
        knowledge: [],
        memoryContext: [],
        profile: "balanced",
        userPrompt: `${messageWithReference}\nBunu açıkla`,
      });
      const normalized = prompt.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("referans satırlarını yalnızca"), true);
      assert.equal(normalized.includes("manualcontextitemcount"), false);
      assert.equal(normalized.includes("staged context"), false);
      assert.equal(normalized.includes("search result"), false);
    },
  },
  {
    name: "no manual context keeps reference guidance empty",
    run: () => {
      const guidance = getVisibleReferenceResponseGuidance("Merhaba");
      assert.equal(guidance, "");
    },
  },
  {
    name: "nano remains no-tool and no-provider-message-forward mode",
    run: () => {
      assert.equal(isNanoNoToolMode("nano"), true);
      assert.equal(shouldForwardProviderMessages("nano"), false);
    },
  },
  {
    name: "guidance has no storage write instructions",
    run: () => {
      const guidance = getVisibleReferenceResponseGuidance(messageWithReference).toLocaleLowerCase("tr-TR");
      assert.equal(guidance.includes("localstorage"), false);
      assert.equal(guidance.includes("sessionstorage"), false);
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

console.log("Phase 35 nano visible reference style smoke checks passed.");
