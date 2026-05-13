import assert from "node:assert/strict";
import {
  containsDisallowedClaimPhrase,
  DISALLOWED_CLAIM_PHRASES,
} from "../src/core/nano/grounded-response-style";
import {
  detectManualContextInsufficiency,
  getInsufficientContextResponseGuidance,
} from "../src/core/nano/insufficient-context-policy";
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
    name: "no manual context + whole file ask => insufficiency",
    run: () => {
      const message = "Bu dosyaya göre proje genelini analiz et.";
      const detected = detectManualContextInsufficiency(message);
      assert.equal(detected.hasManualContext, false);
      assert.equal(detected.needsMoreContext, true);
      assert.equal(detected.safeReasonCode, "file_scope_without_visible_context");
    },
  },
  {
    name: "manual context with too short snippet => insufficiency",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Alinti: x=1",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const detected = detectManualContextInsufficiency(message);
      assert.equal(detected.hasManualContext, true);
      assert.equal(detected.hasSnippetLikeContent, false);
      assert.equal(detected.safeReasonCode, "snippet_missing_or_too_short");
    },
  },
  {
    name: "broken boundary => invalid boundary reason",
    run: () => {
      const message = "[Workspace Context - Manuel Eklenen]\n1. a.ts\nAlinti: const a = 1;";
      const detected = detectManualContextInsufficiency(message);
      assert.equal(detected.hasManualContext, true);
      assert.equal(detected.boundaryValid, false);
      assert.equal(detected.safeReasonCode, "invalid_manual_context_boundary");
    },
  },
  {
    name: "reference-only context => no automatic content access",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. a.ts",
        "Referans: workspace | satir 10-20",
        "[/Workspace Context - Manuel Eklenen]",
      ].join("\n");
      const detected = detectManualContextInsufficiency(message);
      assert.equal(detected.hasReferenceOnlyContext, true);
      assert.equal(detected.safeReasonCode, "reference_only_context");

      const guidance = getInsufficientContextResponseGuidance(message);
      assert.equal(guidance.includes("referans etiketinin dosya içeriğine otomatik erişim sağlamadığını"), true);
    },
  },
  {
    name: "small snippet + whole project ask => scope limited",
    run: () => {
      const message = [
        "[Workspace Context - Manuel Eklenen]",
        "1. b.ts",
        "Alinti: const run = () => ok;",
        "[/Workspace Context - Manuel Eklenen]",
        "Buna göre tüm proje analizi çıkar.",
      ].join("\n");
      const detected = detectManualContextInsufficiency(message);
      assert.equal(detected.asksForWholeFileOrProject, true);
      assert.equal(detected.safeReasonCode, "whole_scope_request_with_small_snippet");
    },
  },
  {
    name: "sensitive domain + low context => safe domain boundary",
    run: () => {
      const message = "Hukuk açısından kesin yorum yapar mısın?";
      const detected = detectManualContextInsufficiency(message);
      assert.equal(detected.safeReasonCode, "sensitive_domain_insufficient_context");

      const guidance = getInsufficientContextResponseGuidance(message);
      assert.equal(guidance.includes("kesin yargı kurma"), true);
    },
  },
  {
    name: "guidance uses refusal boundary style phrases",
    run: () => {
      const guidance = getInsufficientContextResponseGuidance("Bu dosyaya göre tüm projeyi anlat.");
      assert.equal(guidance.includes("Bu snippet tek başına tüm dosya/proje hakkında kesin sonuç için yeterli değil"), true);
      assert.equal(guidance.includes("Dosyanın tamamını görmeden kesin konuşamam"), true);
      assert.equal(guidance.includes("ilgili fonksiyonun tamamı"), true);
    },
  },
  {
    name: "guidance does not contain disallowed claim phrases",
    run: () => {
      const guidance = getInsufficientContextResponseGuidance("Bu dosyaya göre tüm projeyi anlat.");
      for (const phrase of DISALLOWED_CLAIM_PHRASES) {
        assert.equal(guidance.toLocaleLowerCase("tr-TR").includes(phrase), false);
      }
      assert.equal(containsDisallowedClaimPhrase(guidance), false);
      assert.equal(guidance.toLocaleLowerCase("tr-TR").includes("rag sonucuna göre"), false);
    },
  },
  {
    name: "detection output does not expose raw context or paths",
    run: () => {
      const detected = detectManualContextInsufficiency(
        "[Workspace Context - Manuel Eklenen]\nReferans: C:\\Users\\secret\\x.ts\n[/Workspace Context - Manuel Eklenen]"
      ) as unknown as Record<string, unknown>;
      const keys = Object.keys(detected);
      assert.equal(keys.includes("rawContextBlock"), false);
      assert.equal(keys.includes("rawUserMessage"), false);
      assert.equal(keys.includes("fullPath"), false);
      assert.equal(keys.includes("canonicalPath"), false);
    },
  },
  {
    name: "system prompt includes insufficient context guidance without metadata injection",
    run: () => {
      const prompt = buildNanoSystemPrompt({
        analysis: analysis(),
        knowledge: [],
        memoryContext: [],
        profile: "balanced",
        userPrompt: "Bu dosyaya göre tüm projeyi anlat.",
      });
      const normalized = prompt.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("bağlam yetersizse cevaba sınır koyarak başla"), true);
      assert.equal(normalized.includes("manualcontextitemcount"), false);
      assert.equal(normalized.includes("staged context"), false);
    },
  },
  {
    name: "nano still no-tool and no-provider-message-forward",
    run: () => {
      assert.equal(isNanoNoToolMode("nano"), true);
      assert.equal(shouldForwardProviderMessages("nano"), false);
    },
  },
  {
    name: "guidance does not mention storage writes",
    run: () => {
      const guidance = getInsufficientContextResponseGuidance("Bu dosyaya göre proje analizi yap.").toLocaleLowerCase("tr-TR");
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

console.log("Phase 36 nano insufficient context smoke checks passed.");
