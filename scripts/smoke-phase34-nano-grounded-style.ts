import assert from "node:assert/strict";
import {
  containsDisallowedClaimPhrase,
  DISALLOWED_CLAIM_PHRASES,
  getGroundedResponseStyleGuidance,
  SAFE_GROUNDED_ALTERNATIVES,
} from "../src/core/nano/grounded-response-style";
import { getVisibleContextResponseGuidance } from "../src/core/nano/visible-context-policy";
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

const contextMessage =
  "[Workspace Context - Manuel Eklenen]\n1. app.ts\nconst x = 1;\n[/Workspace Context - Manuel Eklenen]";

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "grounded guidance is generated for manual context",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis(),
      });
      assert.ok(guidance.length > 0);
      assert.equal(guidance.includes("Paylaştığın snippet'e göre"), true);
      assert.equal(guidance.includes("yalnızca kullanıcı mesajında görünen alıntıya dayan"), true);
    },
  },
  {
    name: "no manual context keeps grounded guidance empty",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: "Merhaba",
        analysis: analysis(),
      });
      assert.equal(guidance, "");
    },
  },
  {
    name: "anti-claim phrases are not leaked in grounded guidance",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis(),
      });
      const normalized = guidance.toLocaleLowerCase("tr-TR");
      for (const phrase of DISALLOWED_CLAIM_PHRASES) {
        assert.equal(normalized.includes(phrase), false);
      }
    },
  },
  {
    name: "safe alternatives are exposed",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis(),
      });
      assert.equal(guidance.includes(SAFE_GROUNDED_ALTERNATIVES[0]), true);
      assert.equal(guidance.includes(SAFE_GROUNDED_ALTERNATIVES[1]), true);
    },
  },
  {
    name: "coding guidance keeps snippet boundary",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis({ kind: "coding", keywords: ["typescript"] }),
      });
      assert.equal(guidance.includes("eksik import/dependency"), true);
      assert.equal(guidance.includes("bu snippet'e göre"), true);
    },
  },
  {
    name: "seo-writing guidance added when relevant",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis({ kind: "creative", keywords: ["seo", "içerik"] }),
      });
      assert.equal(guidance.includes("başlık, alt başlık"), true);
      assert.equal(guidance.includes("Tüm siteyi veya tüm içeriği analiz ettiğini ima etme"), true);
    },
  },
  {
    name: "legal safety boundary guidance exists",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis({ riskLevel: "high", keywords: ["hukuk", "sözleşme"] }),
      });
      assert.equal(guidance.includes("kesin hüküm"), true);
      assert.equal(guidance.includes("hukuk uzmanına danışma"), true);
    },
  },
  {
    name: "psychology safety boundary guidance exists",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis({ keywords: ["psikoloji", "anksiyete"] }),
      });
      assert.equal(guidance.includes("tanı koyma"), true);
      assert.equal(guidance.includes("profesyonel yardım"), true);
    },
  },
  {
    name: "system prompt includes grounded guidance with manual context",
    run: () => {
      const prompt = buildNanoSystemPrompt({
        analysis: analysis(),
        knowledge: [],
        memoryContext: [],
        profile: "balanced",
        userPrompt: `${contextMessage}\nBunu açıkla`,
      });
      assert.equal(prompt.includes("Paylaştığın snippet'e göre"), true);
      assert.equal(prompt.includes("manualContextItemCount"), false);
      assert.equal(prompt.toLocaleLowerCase("tr-TR").includes("staged context"), false);
    },
  },
  {
    name: "visible policy preserves no-tool no-rag wording without banned claims",
    run: () => {
      const guidance = getVisibleContextResponseGuidance(contextMessage);
      assert.equal(guidance.includes("retrieval"), true);
      assert.equal(containsDisallowedClaimPhrase(guidance), false);
    },
  },
  {
    name: "policy text does not include storage write instructions",
    run: () => {
      const guidance = getGroundedResponseStyleGuidance({
        message: contextMessage,
        analysis: analysis(),
      });
      const normalized = guidance.toLocaleLowerCase("tr-TR");
      assert.equal(normalized.includes("localstorage"), false);
      assert.equal(normalized.includes("sessionstorage"), false);
      assert.equal(normalized.includes("disk"), false);
      assert.equal(normalized.includes("memory'ye yaz"), false);
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

console.log("Phase 34 nano grounded manual context smoke checks passed.");
