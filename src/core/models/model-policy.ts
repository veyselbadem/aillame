// Aillame Model Policy (FAZ 2)
// Default model selection rules. No runtime imports.

import { getAllModels, getEnabledModels, INTERNAL_TEXT_GGUF_MODEL_ID } from './registry';

export function getDefaultModelForMode(mode: string): string | undefined {
  if (mode === 'code') {
    const envOverride = process.env.AILLAME_DEFAULT_CODE_MODEL_ID;
    if (envOverride) return envOverride;
  }
  const globalOverride = process.env.AILLAME_DEFAULT_TEXT_MODEL_ID;
  if (globalOverride) return globalOverride;

  const enabledModels = getEnabledModels();
  const modeMatch = enabledModels.find((m) => m.defaultForModes?.includes(mode));
  if (modeMatch) return modeMatch.id;

  const textFallback = enabledModels.find(
    (m) => m.type === 'text' && m.purpose === 'chat'
  );
  if (textFallback) return textFallback.id;

  const hardFallback = getAllModels().find((m) => m.id === INTERNAL_TEXT_GGUF_MODEL_ID);
  return hardFallback?.id;
}

export function getDefaultTextModelId(): string | undefined {
  return getDefaultModelForMode('general');
}

export function getDefaultCodeModelId(): string | undefined {
  return getDefaultModelForMode('code');
}