import type { ModelAdapterId } from '@core/model-adapters/base';
import { AILLAME_MODES, DEFAULT_AILLAME_MODE } from './modes';
import type {
  AdapterRequirement,
  AillameDebugMetadata,
  AillameIntent,
  AillameMode,
  AillameRouteDecision,
  AillameRouteInput,
  MemoryScopeReference,
} from './types';

const IMAGE_GENERATION_PHRASES = [
  'görsel üret',
  'görsel oluştur',
  'resim üret',
  'resim oluştur',
  'fotoğraf üret',
  'fotoğraf oluştur',
  'image generate',
  'generate image',
];

const VISUAL_OBJECT_KEYWORDS = [
  'görsel',
  'resim',
  'resmi',
  'fotoğraf',
  'fotoğrafı',
  'illüstrasyon',
  'illustration',
  'image',
  'logo',
  'ikon',
];

const GENERATION_ACTION_KEYWORDS = ['üret', 'oluştur', 'çiz', 'generate', 'tasarla'];

const MIXED_TEXT_IMAGE_KEYWORDS = [
  'afiş',
  'poster',
  'kapak',
  'banner',
  'sosyal medya görseli',
  'reklam görseli',
  'thumbnail',
  'ilan',
];

const IMAGE_ANALYSIS_KEYWORDS = [
  'görsel analiz',
  'resmi analiz',
  'fotoğrafı analiz',
  'bu görsel',
  'bu resim',
  'ne görüyorsun',
  'ocr',
  'metni oku',
];

const MODE_PRIORITY: Record<AillameMode, number> = {
  general: 1,
  education: 2,
  code: 3,
  economy: 4,
};

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function findMatches(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

function getImageGenerationMatches(text: string): string[] {
  const phraseMatches = findMatches(text, IMAGE_GENERATION_PHRASES);
  const visualMatches = findMatches(text, VISUAL_OBJECT_KEYWORDS);
  const actionMatches = findMatches(text, GENERATION_ACTION_KEYWORDS);

  if (visualMatches.length === 0 || actionMatches.length === 0) {
    return phraseMatches;
  }

  return [...phraseMatches, ...visualMatches, ...actionMatches];
}

function detectModes(text: string): {
  selectedModes: AillameMode[];
  primaryMode: AillameMode;
  matchedModeKeywords: Partial<Record<AillameMode, string[]>>;
} {
  const matchedModeKeywords: Partial<Record<AillameMode, string[]>> = {};
  const scores = new Map<AillameMode, number>();

  for (const mode of AILLAME_MODES) {
    const matches = findMatches(text, mode.keywords);
    if (matches.length > 0) {
      matchedModeKeywords[mode.id] = matches;
      scores.set(mode.id, matches.length);
    }
  }

  const selectedModes = Array.from(scores.keys());
  if (selectedModes.length === 0) {
    return {
      selectedModes: [DEFAULT_AILLAME_MODE],
      primaryMode: DEFAULT_AILLAME_MODE,
      matchedModeKeywords,
    };
  }

  const primaryMode = selectedModes.reduce<AillameMode>((current, candidate) => {
    const currentScore = scores.get(current) ?? 0;
    const candidateScore = scores.get(candidate) ?? 0;
    if (candidateScore > currentScore) return candidate;
    if (candidateScore === currentScore && MODE_PRIORITY[candidate] > MODE_PRIORITY[current]) {
      return candidate;
    }
    return current;
  }, selectedModes[0]);

  return { selectedModes, primaryMode, matchedModeKeywords };
}

function detectIntent(
  text: string,
  selectedModes: AillameMode[],
  imageCount: number
): { intent: AillameIntent; matchedIntentKeywords: string[] } {
  if (!text && imageCount === 0) {
    return { intent: 'unknown', matchedIntentKeywords: [] };
  }

  const mixedMatches = findMatches(text, MIXED_TEXT_IMAGE_KEYWORDS);
  const generationMatches = getImageGenerationMatches(text);
  const analysisMatches = findMatches(text, IMAGE_ANALYSIS_KEYWORDS);

  if (mixedMatches.length > 0 && generationMatches.length > 0) {
    return {
      intent: 'mixed_text_image',
      matchedIntentKeywords: [...mixedMatches, ...generationMatches],
    };
  }

  if (imageCount > 0 && generationMatches.length > 0) {
    return {
      intent: 'mixed_text_image',
      matchedIntentKeywords: [...analysisMatches, ...generationMatches],
    };
  }

  if (generationMatches.length > 0) {
    return { intent: 'image_generation', matchedIntentKeywords: generationMatches };
  }

  if (imageCount > 0 || analysisMatches.length > 0) {
    return { intent: 'image_analysis', matchedIntentKeywords: analysisMatches };
  }

  if (selectedModes.includes('code')) {
    return {
      intent: 'code',
      matchedIntentKeywords: selectedModes.includes('code') ? ['code-mode'] : [],
    };
  }

  if (selectedModes.includes('economy')) {
    return {
      intent: 'economy_analysis',
      matchedIntentKeywords: selectedModes.includes('economy') ? ['economy-mode'] : [],
    };
  }

  if (selectedModes.includes('education')) {
    return {
      intent: 'education_content',
      matchedIntentKeywords: selectedModes.includes('education') ? ['education-mode'] : [],
    };
  }

  return { intent: 'text', matchedIntentKeywords: [] };
}

function uniqueAdapters(adapters: AdapterRequirement[]): AdapterRequirement[] {
  const seen = new Set<ModelAdapterId>();
  const result: AdapterRequirement[] = [];
  for (const adapter of adapters) {
    if (seen.has(adapter.adapterId)) continue;
    seen.add(adapter.adapterId);
    result.push(adapter);
  }
  return result;
}

function getRequiredAdapters(intent: AillameIntent): AdapterRequirement[] {
  if (intent === 'image_generation') {
    return [
      {
        adapterId: 'sdxl-image',
        reason: 'The request asks for direct image generation.',
      },
    ];
  }

  if (intent === 'mixed_text_image') {
    return uniqueAdapters([
      {
        adapterId: 'qwen-text',
        reason: 'Qwen should plan or refine the visual prompt before generation.',
      },
      {
        adapterId: 'sdxl-image',
        reason: 'SDXL should generate the final image artifact.',
      },
    ]);
  }

  return [
    {
      adapterId: 'qwen-text',
      reason: intent === 'image_analysis'
        ? 'Qwen3-VL handles multimodal image understanding.'
        : 'Qwen handles advanced text reasoning for Aillame.',
    },
  ];
}

function getMemoryScopes(
  selectedModes: AillameMode[],
  primaryMode: AillameMode,
  intent: AillameIntent
): MemoryScopeReference[] {
  const scopes: MemoryScopeReference[] = [
    {
      layer: 'global',
      priority: 'secondary',
      reason: 'Global memory can provide user preferences and system-level context.',
    },
    {
      layer: 'session',
      priority: 'primary',
      reason: 'Session memory keeps the current conversation coherent.',
    },
  ];

  for (const mode of selectedModes) {
    scopes.push({
      layer: 'mode',
      mode,
      priority: mode === primaryMode ? 'primary' : 'secondary',
      reason: mode === primaryMode
        ? 'Primary mode memory should be searched first.'
        : 'Secondary mode memory may add cross-domain context.',
    });
  }

  if (intent === 'mixed_text_image' || intent === 'image_generation') {
    scopes.push({
      layer: 'task',
      priority: 'secondary',
      reason: 'Image generation tasks benefit from recording prompt planning and output metadata.',
    });
  }

  return scopes;
}

function getConfidence(
  matchedModeKeywords: Partial<Record<AillameMode, string[]>>,
  matchedIntentKeywords: string[]
): number {
  const modeHits = Object.values(matchedModeKeywords).reduce(
    (total, matches) => total + (matches?.length ?? 0),
    0
  );
  const rawScore = 0.35 + modeHits * 0.1 + matchedIntentKeywords.length * 0.12;
  return Math.min(0.95, Math.max(0.35, Number(rawScore.toFixed(2))));
}

export function routeAillameRequest(input: AillameRouteInput): AillameRouteDecision {
  const normalizedPrompt = normalizeText(input.prompt);
  const imageCount = input.imageCount ?? 0;
  const { selectedModes, primaryMode, matchedModeKeywords } = detectModes(normalizedPrompt);
  const { intent, matchedIntentKeywords } = detectIntent(normalizedPrompt, selectedModes, imageCount);
  const requiredAdapters = getRequiredAdapters(intent);
  const memoryScopes = getMemoryScopes(selectedModes, primaryMode, intent);
  const confidence = getConfidence(matchedModeKeywords, matchedIntentKeywords);

  const debugMetadata: AillameDebugMetadata = {
    classifier: 'rules-v1',
    confidence,
    matchedModeKeywords,
    matchedIntentKeywords,
    notes: [
      'Rule-based router MVP; model-backed classification can replace this without changing the decision shape.',
    ],
  };

  return {
    selectedModes,
    primaryMode,
    intent,
    requiredAdapters,
    memoryScopes,
    safetyFlags: {
      requiresFinancialDisclaimer: selectedModes.includes('economy') || intent === 'economy_analysis',
      containsImageInput: imageCount > 0,
      mayGenerateImage: intent === 'image_generation' || intent === 'mixed_text_image',
      allowAutomaticMemoryWrite: intent !== 'unknown',
    },
    debugMetadata,
  };
}
