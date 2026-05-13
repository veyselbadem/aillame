import assert from "node:assert/strict";
import {
  containsDisallowedClaimPhrase,
  DISALLOWED_CLAIM_PHRASES,
} from "../src/core/nano/grounded-response-style";
import {
  detectManualContextAnswerScenario,
  getManualContextAnswerStructureGuidance,
} from "../src/core/nano/manual-context-answer-structure";
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
    name: "manual context generates structure guidance",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: const result = doTask(item);",
        "[/Workspace Context - Manuel Eklenen]",
        "Bu kodda sorun ne olabilir?",
      ].join("\n");
      const guidance = getManualContextAnswerStructureGuidance(message);
      assert.equal(guidance.length > 0, true);
      assert.equal(guidance.includes("bağlam sınır"), true);
      assert.equal(guidance.includes("görünen snippet'e göre"), true);
    },
  },
  {
    name: "no manual context keeps behavior unchanged",
    run: () => {
      const scenario = detectManualContextAnswerScenario("Merhaba");
      assert.equal(scenario.hasManualContext, false);
      assert.equal(getManualContextAnswerStructureGuidance("Merhaba"), "");
    },
  },
  {
    name: "reference is treated only as visible label",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: value = compute(data)",
        "Referans: src/app.ts | satir 10-20",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const scenario = detectManualContextAnswerScenario(message);
      const guidance = getManualContextAnswerStructureGuidance(message).toLocaleLowerCase("tr-TR");
      assert.equal(scenario.hasReferences, true);
      assert.equal(guidance.includes("görünür referans etiketi"), true);
      assert.equal(guidance.includes("dosya erişimi"), true);
    },
  },
  {
    name: "insufficiency asks for more context",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: x",
        "[/Workspace Context - Manuel Eklenen]",
        "tüm projeye göre kesin söyle",
      ].join("\n");
      const scenario = detectManualContextAnswerScenario(message);
      const guidance = getManualContextAnswerStructureGuidance(message).toLocaleLowerCase("tr-TR");
      assert.equal(scenario.hasInsufficiency, true);
      assert.equal(scenario.shouldAskForMoreContext, true);
      assert.equal(guidance.includes("ek snippet/fonksiyon/hata metni iste"), true);
    },
  },
  {
    name: "conflict preserves avoid-definitive guidance",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: feature enabled",
        "2. b.ts",
        "Alinti: feature disabled",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const scenario = detectManualContextAnswerScenario(message);
      const guidance = getManualContextAnswerStructureGuidance(message).toLocaleLowerCase("tr-TR");
      assert.equal(scenario.hasConflict, true);
      assert.equal(guidance.includes("kesin hükümden kaçın"), true);
    },
  },
  {
    name: "coding scenario template exists",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. route.ts",
        "Alinti: function handle(req){ return result }",
        "[/Workspace Context - Manuel Eklenen]",
        "Bu kodda bug var mı?",
      ].join("\n");
      const scenario = detectManualContextAnswerScenario(message);
      const guidance = getManualContextAnswerStructureGuidance(message);
      assert.equal(scenario.suggestedStructure, "coding_snippet");
      assert.equal(guidance.includes("Snippet'e göre"), true);
      assert.equal(guidance.includes("Muhtemel sorun"), true);
    },
  },
  {
    name: "seo or writing scenario template exists",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. landing.txt",
        "Alinti: En iyi hizmet burada, hemen al.",
        "[/Workspace Context - Manuel Eklenen]",
        "SEO için bu metni iyileştir",
      ].join("\n");
      const scenario = detectManualContextAnswerScenario(message);
      const guidance = getManualContextAnswerStructureGuidance(message);
      assert.equal(scenario.suggestedStructure, "seo_writing");
      assert.equal(guidance.includes("Görünen metne göre"), true);
      assert.equal(guidance.includes("İyileştirme"), true);
    },
  },
  {
    name: "legal or psychology scenario template exists",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. note.txt",
        "Alinti: Bu sözleşmede cayma şartı yok gibi görünüyor.",
        "[/Workspace Context - Manuel Eklenen]",
        "Bu metin hukuki olarak riskli mi?",
      ].join("\n");
      const scenario = detectManualContextAnswerScenario(message);
      const guidance = getManualContextAnswerStructureGuidance(message);
      assert.equal(scenario.suggestedStructure, "legal_psychology");
      assert.equal(guidance.includes("genel değerlendirme"), true);
      assert.equal(guidance.includes("Sınır/uyarı"), true);
    },
  },
  {
    name: "guidance does not include forbidden claims",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: test",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const guidance = getManualContextAnswerStructureGuidance(message);
      const normalized = guidance.toLocaleLowerCase("tr-TR");
      for (const phrase of DISALLOWED_CLAIM_PHRASES) {
        assert.equal(normalized.includes(phrase), false);
      }
      assert.equal(containsDisallowedClaimPhrase(guidance), false);
      assert.equal(normalized.includes("rag sonucuna göre"), false);
    },
  },
  {
    name: "scenario payload does not return raw content or paths",
    run: () => {
      const scenario = detectManualContextAnswerScenario(
        "[Workspace Context - Manuel Eklenen]\n1. x.ts\nAlinti: y\n[/Workspace Context - Manuel Eklenen]"
      ) as unknown as Record<string, unknown>;
      const keys = Object.keys(scenario);
      assert.equal(keys.includes("rawContextBlock"), false);
      assert.equal(keys.includes("rawUserMessage"), false);
      assert.equal(keys.includes("fullPath"), false);
      assert.equal(keys.includes("canonicalPath"), false);
      assert.equal(keys.includes("physicalPath"), false);
      assert.equal(keys.includes("snippetText"), false);
    },
  },
  {
    name: "system prompt includes structure guidance and no metadata injection",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. app.ts",
        "Alinti: const value = fn();",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const prompt = buildNanoSystemPrompt({
        analysis: analysis(),
        knowledge: [],
        memoryContext: [],
        profile: "balanced",
        userPrompt: message,
      });
      const normalized = prompt.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("yanıtı düzenli, kısa ve anlaşılır bir yapı"), true);
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

console.log("Phase 38 nano answer structure smoke checks passed.");
