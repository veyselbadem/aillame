import { NanoDecision } from "./nano-decision.types";

export class DecisionMerger {
  static getFallbackDecision(prompt: string, reason?: string): NanoDecision {
    return {
      project: "generic",
      task: "generic_chat",
      workflow: "generic.chat",
      modelNeeds: ["text"],
      permissionMode: "read_only",
      confidence: 0.4,
      classifierLayer: "fallback",
      fallbackWorkflow: "generic.chat",
      reasoningSummary: reason || "İstek belirli bir Aillame projesiyle eşleşmedi.",
      warnings: ["Genel sohbet modunda devam ediliyor."],
      createdAt: new Date().toISOString()
    };
  }

  static merge(bootstrap: NanoDecision | null, llm: NanoDecision | null): NanoDecision {
    // Phase 6: Simple logic - if bootstrap found something, use it.
    if (bootstrap) return bootstrap;
    
    // If LLM found something (placeholder for future), use it.
    if (llm) return llm;

    // Otherwise, generic fallback.
    return this.getFallbackDecision("");
  }
}
