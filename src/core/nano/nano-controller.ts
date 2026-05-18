import { routeAillameRequest } from "../aillame-router/router";
import { nativeLocalProvider } from "../../providers/llm/native-local";
import { cleanupNanoOutput } from "./nano-output-cleanup";
import { analyzeNanoTask } from "./task-analyzer";
import { retrieveNanoKnowledge } from "./retrieval";
import { buildNanoModelPrompt, buildNanoSystemPrompt } from "./system-prompt";
import type { NanoAnswer, NanoControlPlan, NanoGenerationSettings, NanoUserInput } from "./types";

import { buildNanoGenerationConfig, NANO_PROFILES } from "./nano-generation-config";
import { RagRetrieverService } from "@/services/rag/rag-retriever.service";

function getSettings(input: NanoUserInput, plan: Pick<NanoControlPlan, "analysis">): NanoGenerationSettings {
  const profile = input.profile ? NANO_PROFILES[input.profile] : NANO_PROFILES.balanced;
  return buildNanoGenerationConfig({
    analysis: plan.analysis,
    profile,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  });
}

function buildFallbackAnswer(plan: NanoControlPlan, reason: string): string {
  const clarification = plan.analysis.needsClarification
    ? "İstek çok kısa olduğu için hedefi netleştirmem gerekir."
    : `Yerel üretim motoru şu an hazır değil. (${reason})`;

  const actionHint = reason === 'MODEL_NOT_LOADED' 
    ? "Lütfen Kütüphane'den bir model seçip yükleyin."
    : reason === 'RUNTIME_NOT_READY'
    ? "Lütfen Runtime'ı başlatın."
    : "Lütfen sistem durumunu kontrol edin.";

  return [
    clarification,
    `Görev türü: ${plan.analysis.kind} | Zorluk: ${plan.analysis.difficulty}`,
    `👉 ${actionHint}`,
    "Aillame Nano yerel runtime üzerinden çalışmak için hazır olduğunda bu isteği doğrudan işleyebileceğim.",
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
    // Phase 18: RAG henüz aktif değil, boş bilgi kartları ile ilerliyoruz.
    const knowledge: any[] = []; 
    const profile = input.profile || 'balanced';
    const memoryContext: string[] = []; // Phase 21: Memory skeleton
    const partialPlan = {
      route,
      analysis,
      knowledge,
      profile,
      memoryContext,
      userPrompt: input.prompt,
    };
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
      profile,
      memoryContext,
    };
  }

  async answer(input: NanoUserInput): Promise<NanoAnswer> {
    console.log(`[NanoController] answer() called with prompt: "${input.prompt.substring(0, 50)}..."`);
    const plan = this.createPlan(input);
    const warnings: string[] = [];

    // Phase 2.2: RAG Context Injection (Always run for context-awareness)
    try {
      console.log(`[NanoController] Fetching RAG context for: "${input.prompt}"`);
      const contextDocs = await RagRetrieverService.retrieveContext(input.prompt);
      console.log(`[NanoController] Found ${contextDocs.length} context docs`);
      if (contextDocs.length > 0) {
        const formattedContext = RagRetrieverService.formatContext(contextDocs);
        console.log(`[NanoController] Injecting RAG context into system prompt`);
        plan.systemPrompt = `${formattedContext}${plan.systemPrompt}`;
        plan.knowledge = contextDocs.map(d => ({ id: d.id, text: d.text, score: d.score }));
      }
    } catch (ragError) {
      console.error("[NanoController] RAG Retrieval failed:", ragError);
    }

    try {
      const status = await nativeLocalProvider.getStatus?.();
      
      if (!status || status.runtimeState !== 'loaded' || !status.isModelLoaded) {
        const reason = status?.errorCode || "MODEL_NOT_LOADED";
        return {
          content: buildFallbackAnswer(plan, reason),
          plan,
          usedLocalEngine: false,
          warnings: [`Nano runtime status: ${reason}`],
          engineDebug: {
            nativeEngineAvailable: status?.runtimeState === 'runtime_ready' || status?.runtimeState === 'loaded',
            checkpointLoaded: status?.isModelLoaded ?? false,
            generatedTokenCount: 0,
            decodedLength: 0,
            usefulOutput: false,
            reason: reason,
          },
        };
      }

      if (status.isGenerating) {
         return {
           content: "Sistem şu an başka bir cevap üretiyor. Lütfen bekleyin.",
           plan,
           usedLocalEngine: false,
           warnings: ["ENGINE_BUSY"],
         };
      }

      // Phase 18: Non-streaming generation via Provider
      console.log(`[NanoController] Sending prompt to provider: "${plan.modelPrompt.substring(0, 100)}..."`);
      const rawContent = await nativeLocalProvider.generate(plan.modelPrompt, input.onToken, input.signal, {
        maxTokens: plan.settings.maxNewTokens,
        temperature: plan.settings.temperature,
        topP: plan.settings.topP,
        systemPrompt: plan.systemPrompt
      } as any);
      
      console.log(`[NanoController] Raw content received: "${rawContent.substring(0, 100)}..."`);
      
      const cleanup = cleanupNanoOutput(rawContent, plan.settings);
      const content = cleanup.content || (cleanup.useful ? rawContent : "Aillame Nano geçerli bir yanıt üretemedi.");

      return {
        content,
        plan,
        usedLocalEngine: true,
        warnings: cleanup.useful ? [] : [cleanup.reason ?? "LOW_USEFUL_OUTPUT"],
        rawContent,
        engineDebug: {
          nativeEngineAvailable: true,
          checkpointLoaded: true,
          generatedTokenCount: rawContent.length, 
          decodedLength: content.length,
          usefulOutput: cleanup.useful,
          reason: undefined,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown local generation error.";
      warnings.push(message);
      return {
        content: buildFallbackAnswer(plan, message),
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
