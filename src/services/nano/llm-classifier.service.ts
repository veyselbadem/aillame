import { NanoDecision } from "./nano-decision.types";

export class LLMClassifier {
  /**
   * Placeholder for future LLM-based classification.
   * In Phase 6, this is not implemented.
   */
  static async classify(prompt: string): Promise<{ available: boolean; decision: NanoDecision | null; reason?: string }> {
    return {
      available: false,
      decision: null,
      reason: "LLM_CLASSIFIER_NOT_IMPLEMENTED_IN_PHASE_6"
    };
  }
}
