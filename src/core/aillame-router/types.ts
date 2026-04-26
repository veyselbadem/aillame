import type { ModelAdapterId } from '@core/model-adapters/base';

export type AillameMode = 'general' | 'education' | 'code' | 'economy';

export type AillameIntent =
  | 'text'
  | 'image_generation'
  | 'image_analysis'
  | 'mixed_text_image'
  | 'code'
  | 'economy_analysis'
  | 'education_content'
  | 'unknown';

export type MemoryScopeLayer = 'global' | 'mode' | 'session' | 'task';

export type MemoryScopePriority = 'primary' | 'secondary';

export type MemoryScopeReference = {
  layer: MemoryScopeLayer;
  priority: MemoryScopePriority;
  reason: string;
  mode?: AillameMode;
};

export type AdapterRequirement = {
  adapterId: ModelAdapterId;
  reason: string;
};

export type AillameSafetyFlags = {
  requiresFinancialDisclaimer: boolean;
  containsImageInput: boolean;
  mayGenerateImage: boolean;
  allowAutomaticMemoryWrite: boolean;
};

export type AillameDebugMetadata = {
  classifier: 'rules-v1';
  confidence: number;
  matchedModeKeywords: Partial<Record<AillameMode, string[]>>;
  matchedIntentKeywords: string[];
  notes: string[];
};

export type AillameRouteInput = {
  prompt: string;
  imageCount?: number;
  attachmentMimeTypes?: string[];
};

export type AillameRouteDecision = {
  selectedModes: AillameMode[];
  primaryMode: AillameMode;
  intent: AillameIntent;
  requiredAdapters: AdapterRequirement[];
  memoryScopes: MemoryScopeReference[];
  safetyFlags: AillameSafetyFlags;
  debugMetadata: AillameDebugMetadata;
};

export type AillameModeDefinition = {
  id: AillameMode;
  label: string;
  description: string;
  keywords: readonly string[];
};
