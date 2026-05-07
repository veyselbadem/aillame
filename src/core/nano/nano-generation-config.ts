import type { NanoTaskAnalysis } from "./types";

export type NanoGenerationConfig = {
  maxNewTokens: number;
  temperature: number;
  topK?: number;
  topP?: number;
  repetitionPenalty?: number;
  stopSequences: string[];
  minUsefulChars: number;
  minUsefulTokens: number;
};

export const DEFAULT_NANO_GENERATION_CONFIG: NanoGenerationConfig = {
  maxNewTokens: 32,
  temperature: 0.35,
  stopSequences: [
    "</answer>",
    "<user_prompt>",
    "</user_prompt>",
    "<system_task>",
    "</system_task>",
  ],
  minUsefulChars: 16,
  minUsefulTokens: 8,
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildNanoGenerationConfig(params: {
  analysis: NanoTaskAnalysis;
  maxTokens?: number;
  temperature?: number;
}): NanoGenerationConfig {
  const inferredMaxTokens = params.analysis.difficulty === "high"
    ? 96
    : params.analysis.difficulty === "medium"
      ? 64
      : DEFAULT_NANO_GENERATION_CONFIG.maxNewTokens;

  const inferredTemperature = params.analysis.kind === "creative" ? 0.65 : DEFAULT_NANO_GENERATION_CONFIG.temperature;

  return {
    ...DEFAULT_NANO_GENERATION_CONFIG,
    maxNewTokens: clampNumber(params.maxTokens ?? inferredMaxTokens, 4, 256),
    temperature: clampNumber(params.temperature ?? inferredTemperature, 0.05, 1.2),
  };
}
