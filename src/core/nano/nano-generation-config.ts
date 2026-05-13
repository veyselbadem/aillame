import type { NanoTaskAnalysis, NanoProfile } from "./types";

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

export const NANO_PROFILES: Record<string, NanoProfile> = {
  fast: {
    id: 'fast',
    label: 'Hızlı',
    description: 'En kısa sürede direkt cevaplar verir.',
    maxTokens: 32,
    temperature: 0.2,
    topP: 0.9,
  },
  balanced: {
    id: 'balanced',
    label: 'Dengeli',
    description: 'Açıklayıcı ve dengeli cevaplar.',
    maxTokens: 64,
    temperature: 0.4,
    topP: 0.95,
  },
  quality: {
    id: 'quality',
    label: 'Kaliteli',
    description: 'Daha detaylı ve yaratıcı analizler.',
    maxTokens: 128,
    temperature: 0.7,
    topP: 1.0,
  },
};

export const DEFAULT_NANO_GENERATION_CONFIG: NanoGenerationConfig = {
  maxNewTokens: NANO_PROFILES.balanced.maxTokens,
  temperature: NANO_PROFILES.balanced.temperature,
  topP: NANO_PROFILES.balanced.topP,
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
  profile?: NanoProfile;
  maxTokens?: number;
  temperature?: number;
}): NanoGenerationConfig {
  const profile = params.profile || NANO_PROFILES.balanced;

  const inferredMaxTokens = params.analysis.difficulty === "high"
    ? Math.max(96, profile.maxTokens)
    : params.analysis.difficulty === "medium"
      ? Math.max(64, profile.maxTokens)
      : profile.maxTokens;

  const inferredTemperature = params.analysis.kind === "creative" 
    ? Math.min(1.0, profile.temperature + 0.2) 
    : profile.temperature;

  return {
    ...DEFAULT_NANO_GENERATION_CONFIG,
    maxNewTokens: clampNumber(params.maxTokens ?? inferredMaxTokens, 4, 1024),
    temperature: clampNumber(params.temperature ?? inferredTemperature, 0.05, 1.5),
    topP: profile.topP,
  };
}
