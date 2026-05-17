import { NanoDecisionResult, NanoDecision } from "./nano-decision.types";
import { BootstrapClassifier } from "./bootstrap-classifier.service";
import { LLMClassifier } from "./llm-classifier.service";
import { DecisionMerger } from "./decision-merger.service";
import { SchemaValidator } from "../schema/schema-validator.service";

export class NanoDecisionEngine {
  /**
   * Decides which project/workflow to use based on the input prompt.
   */
  static async decide(params: {
    prompt: string;
    metadata?: Record<string, unknown>;
  }): Promise<NanoDecisionResult> {
    if (!params.prompt || params.prompt.trim().length === 0) {
      return {
        ok: false,
        decision: DecisionMerger.getFallbackDecision("", "Prompt boş olamaz."),
        diagnostics: {
          bootstrapUsed: false,
          llmUsed: false,
          fallbackUsed: true,
          schemaValidated: false
        },
        error: {
          code: "NANO_PROMPT_REQUIRED",
          message: "Nano kararı için prompt zorunludur."
        }
      };
    }

    let bootstrapDecision = BootstrapClassifier.classify(params.prompt);
    let llmResult = await LLMClassifier.classify(params.prompt);
    
    let finalDecision = DecisionMerger.merge(bootstrapDecision, llmResult.decision);

    // Schema Validation
    const validation = SchemaValidator.validate("nano-decision", finalDecision);
    
    // Fallback if schema invalid (should not happen with hardcoded bootstrap)
    if (!validation.valid) {
      finalDecision = DecisionMerger.getFallbackDecision(params.prompt, "Geçersiz karar yapısı üretildi.");
    }

    return {
      ok: true,
      decision: finalDecision,
      diagnostics: {
        bootstrapUsed: !!bootstrapDecision,
        llmUsed: llmResult.available,
        fallbackUsed: finalDecision.classifierLayer === "fallback",
        schemaValidated: validation.valid
      }
    };
  }
}
