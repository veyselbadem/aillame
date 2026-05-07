import { routeAillameRequest } from "../aillame-router/router";
import { getAillameEngine, initializeAillameNanoEngine } from "../engine/rust-core";
import { AillameTokenizer } from "../engine/tokenizer";
import { buildNanoGenerationConfig } from "./nano-generation-config";
import { cleanupNanoOutput, extractGeneratedTokenIds } from "./nano-output-cleanup";
import { analyzeNanoTask } from "./task-analyzer";
import { retrieveNanoKnowledge } from "./retrieval";
import { buildNanoModelPrompt, buildNanoSystemPrompt } from "./system-prompt";
import type { NanoAnswer, NanoControlPlan, NanoGenerationSettings, NanoUserInput } from "./types";

function getSettings(input: NanoUserInput, plan: Pick<NanoControlPlan, "analysis">): NanoGenerationSettings {
  return buildNanoGenerationConfig({
    analysis: plan.analysis,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  });
}

function buildFallbackAnswer(plan: NanoControlPlan): string {
  const clarification = plan.analysis.needsClarification
    ? "İstek çok kısa olduğu için hedefi netleştirmem gerekir."
    : "Yerel üretim motoru hazır değil; yine de kontrol katmanı görevi analiz etti.";

  const knowledge = plan.knowledge.length > 0
    ? `İlgili yerel bağlam: ${plan.knowledge.map((hit) => hit.title).join(", ")}.`
    : "İlgili yerel bilgi kartı bulunamadı.";

  return [
    clarification,
    `Görev türü: ${plan.analysis.kind}. Zorluk: ${plan.analysis.difficulty}. Risk: ${plan.analysis.riskLevel}.`,
    knowledge,
    "Bir sonraki adımda yerel metin modeli bağlandığında bu plan doğrudan üretim prompt'una dönüşecek.",
  ].join("\n");
}

export class AillameNanoController {
  createPlan(input: NanoUserInput): NanoControlPlan {
    const route = routeAillameRequest({
      prompt: input.prompt,
      imageCount: input.images?.length ?? 0,
      attachmentMimeTypes: input.images?.map((image) => image.mimeType),
    });
    const analysis = analyzeNanoTask(input.prompt);
    const knowledge = retrieveNanoKnowledge(`${input.prompt} ${analysis.keywords.join(" ")}`);
    const partialPlan = { route, analysis, knowledge };
    const systemPrompt = buildNanoSystemPrompt(partialPlan);
    const modelPrompt = buildNanoModelPrompt(input.prompt, partialPlan);
    const settings = getSettings(input, { analysis });

    return {
      route,
      analysis,
      knowledge,
      systemPrompt,
      modelPrompt,
      settings,
    };
  }

  async answer(input: NanoUserInput): Promise<NanoAnswer> {
    const plan = this.createPlan(input);
    const engine = getAillameEngine();
    const warnings: string[] = [];

    if (!engine) {
      return {
        content: buildFallbackAnswer(plan),
        plan,
        usedLocalEngine: false,
        warnings: ["Aillame Rust engine could not be loaded."],
        engineDebug: {
          nativeEngineAvailable: false,
          checkpointLoaded: false,
          generatedTokenCount: 0,
          decodedLength: 0,
          usefulOutput: false,
          reason: "NATIVE_ENGINE_NOT_AVAILABLE",
        },
      };
    }

    try {
      const init = initializeAillameNanoEngine(engine);
      if (!init.success) {
        return {
          content: buildFallbackAnswer(plan),
          plan,
          usedLocalEngine: false,
          warnings: [init.reason ?? "Aillame Nano checkpoint could not be loaded."],
          engineDebug: {
            nativeEngineAvailable: true,
            checkpointLoaded: false,
            checkpointPath: init.checkpoint.checkpointPath,
            generatedTokenCount: 0,
            decodedLength: 0,
            usefulOutput: false,
            reason: init.reason ?? "NANO_ENGINE_INIT_FAILED",
          },
        };
      }

      const tokenizer = new AillameTokenizer();
      const fullPrompt = `${plan.systemPrompt}\n\n${plan.modelPrompt}`;
      tokenizer.train(fullPrompt);
      engine.trainTokenizer(fullPrompt);
      const inputIds = tokenizer.encode(fullPrompt);
      const rawOutputIds = engine.generate(new Uint32Array(inputIds), plan.settings.maxNewTokens, plan.settings.temperature);
      const outputIds = Array.from(rawOutputIds);
      const extraction = extractGeneratedTokenIds(outputIds, inputIds);
      const rawContent = tokenizer.decode(extraction.generatedIds);
      const cleanup = cleanupNanoOutput(rawContent, plan.settings);
      const engineGenerated = extraction.generatedIds.length > 0 && cleanup.content.length > 0;
      const content = cleanup.useful ? cleanup.content : buildFallbackAnswer(plan);
      const warningsForOutput = cleanup.useful
        ? warnings
        : [...warnings, cleanup.reason ?? "LOW_USEFUL_OUTPUT"];

      return {
        content,
        plan,
        usedLocalEngine: engineGenerated,
        warnings: warningsForOutput,
        rawContent,
        engineDebug: {
          nativeEngineAvailable: true,
          checkpointLoaded: true,
          checkpointPath: init.checkpoint.checkpointPath,
          generatedTokenCount: extraction.generatedIds.length,
          decodedLength: cleanup.content.length,
          usefulOutput: cleanup.useful,
          cleanupReason: cleanup.reason,
          removedPromptEcho: extraction.removedPromptEcho,
          reason: engineGenerated ? undefined : cleanup.reason ?? "EMPTY_ENGINE_OUTPUT",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown local generation error.";
      warnings.push(message);
      return {
        content: buildFallbackAnswer(plan),
        plan,
        usedLocalEngine: false,
        warnings,
        engineDebug: {
          nativeEngineAvailable: true,
          checkpointLoaded: false,
          generatedTokenCount: 0,
          decodedLength: 0,
          usefulOutput: false,
          reason: message,
        },
      };
    }
  }
}
