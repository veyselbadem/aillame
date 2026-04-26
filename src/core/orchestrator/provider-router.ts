import type { ChatRequestType } from './analyzer';
import { getLLMProvider, getProLLMProvider } from '@providers/llm/selector';
import { getVisionProvider } from '@providers/vision/selector';
import type { AillameTier, LLMMode } from '@apptypes/settings';

export function routeProvider(type: ChatRequestType, mode: LLMMode, tier: AillameTier = 'nano') {
  if (tier === 'pro') {
    return getProLLMProvider();
  }

  if (type === 'image') {
    return getVisionProvider('local');
  }

  if (mode === 'local') {
    return getLLMProvider('local');
  }

  if (mode === 'cloud') {
    return getLLMProvider('cloud');
  }

  return getLLMProvider('hybrid');
}
