import type {
  AillameContentType,
  AillameOutputType,
  AillameTaskType,
} from '@core/contracts/aillame-request';
import type { ModelAdapterId } from '@core/model-adapters/base';
import type { ModelCapability } from '@core/models/registry';
import { selectModelForCapabilities } from '../models/registry';
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

const IMAGE_GENERATION_KEYWORDS = [
  'gorsel uret',
  'gorsel olustur',
  'görsel üret',
  'görsel oluştur',
  'resim uret',
  'resim olustur',
  'resim üret',
  'resim oluştur',
  'afis hazirla',
  'afis olustur',
  'afiş hazırla',
  'afiş oluştur',
  'poster hazirla',
  'poster olustur',
  'poster hazırla',
  'poster oluştur',
  'banner tasarla',
  'banner olustur',
  'banner oluştur',
  'kapak gorseli olustur',
  'kapak görseli oluştur',
  'gorsel konsept olustur',
  'görsel konsept oluştur',
  'resim ciz',
  'resim çiz',
  'karakter ciz',
  'karakter çiz',
  'image generate',
  'generate image',
  'draw image',
];

const VISUAL_SUBJECT_KEYWORDS = [
  'afis',
  'afiş',
  'poster',
  'kapak',
  'banner',
  'sosyal medya gorseli',
  'sosyal medya görseli',
  'reklam gorseli',
  'reklam görseli',
  'thumbnail',
  'ilan',
];

const IMAGE_ANALYSIS_KEYWORDS = [
  'gorsel analiz',
  'görsel analiz',
  'resmi analiz',
  'fotografi analiz',
  'fotoğrafı analiz',
  'bu gorsel',
  'bu görsel',
  'bu resim',
  'ne goruyorsun',
  'ne görüyorsun',
  'ocr',
  'metni oku',
];

const TEXT_OUTPUT_KEYWORDS = [
  'seo yazisi',
  'seo yazısı',
  'makale',
  'blog yazisi',
  'blog yazısı',
  'metin',
  'yazi',
  'yazı',
  'icerik',
  'içerik',
  'copy',
  'caption',
];

const CODE_TASK_KEYWORDS = [
  'kod yaz',
  'kodu duzelt',
  'kodu düzelt',
  'bu kodu duzelt',
  'bu kodu düzelt',
  'component olustur',
  'component oluştur',
  'hata coz',
  'hata çöz',
  'hatasini coz',
  'hatasını çöz',
  'bug coz',
  'bug çöz',
  'refactor',
  'typescript',
  'javascript',
  'python',
];

const AGENT_TASK_KEYWORDS = [
  'projeyi analiz et',
  'proje dosyalarini incele',
  'proje dosyalarını incele',
  'dosyalari incele',
  'dosyaları incele',
  'dosyalari duzelt',
  'dosyaları düzelt',
  'patch oner',
  'patch öner',
  'test komutu oner',
  'test komutu öner',
  'hatalari bul',
  'hataları bul',
];

const ANALYSIS_TASK_KEYWORDS = [
  'analiz et',
  'incele',
  'degerlendir',
  'değerlendir',
  'raporla',
];

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => {
    if (!keyword.includes(' ')) {
      return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(keyword)}([^\\p{L}\\p{N}]|$)`, 'u').test(text);
    }
    return text.includes(keyword);
  });
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
    return candidateScore > currentScore ? candidate : current;
  }, selectedModes[0]);

  return { selectedModes, primaryMode, matchedModeKeywords };
}

function detectExplicitIntent(
  taskType?: AillameTaskType,
  outputType?: AillameOutputType
): { intent: AillameIntent; matchedIntentKeywords: string[] } | undefined {
  if (taskType === 'image') return { intent: 'image_generation', matchedIntentKeywords: ['taskType:image'] };
  if (taskType === 'vision') return { intent: 'image_analysis', matchedIntentKeywords: ['taskType:vision'] };
  if (taskType === 'mixed') return { intent: 'mixed_text_image', matchedIntentKeywords: ['taskType:mixed'] };
  if (taskType === 'code') return { intent: 'code', matchedIntentKeywords: ['taskType:code'] };
  if (taskType === 'agent') return { intent: 'agent', matchedIntentKeywords: ['taskType:agent'] };
  if (taskType === 'analysis') return { intent: 'analysis', matchedIntentKeywords: ['taskType:analysis'] };
  if (taskType === 'chat' || taskType === 'text') {
    return { intent: 'text', matchedIntentKeywords: [`taskType:${taskType}`] };
  }
  if (outputType === 'image') return { intent: 'image_generation', matchedIntentKeywords: ['outputType:image'] };
  if (outputType === 'patch') return { intent: 'agent', matchedIntentKeywords: ['outputType:patch'] };
  return undefined;
}

function detectIntent(
  text: string,
  selectedModes: AillameMode[],
  imageCount: number,
  taskType?: AillameTaskType,
  outputType?: AillameOutputType
): { intent: AillameIntent; matchedIntentKeywords: string[] } {
  const explicitIntent = detectExplicitIntent(taskType, outputType);
  if (explicitIntent) return explicitIntent;

  if (!text && imageCount === 0) {
    return { intent: 'unknown', matchedIntentKeywords: [] };
  }

  const visualSubjectMatches = findMatches(text, VISUAL_SUBJECT_KEYWORDS);
  const generationMatches = findMatches(text, IMAGE_GENERATION_KEYWORDS);
  const analysisMatches = findMatches(text, IMAGE_ANALYSIS_KEYWORDS);
  const textOutputMatches = findMatches(text, TEXT_OUTPUT_KEYWORDS);
  const codeMatches = findMatches(text, CODE_TASK_KEYWORDS);
  const agentMatches = findMatches(text, AGENT_TASK_KEYWORDS);
  const taskAnalysisMatches = findMatches(text, ANALYSIS_TASK_KEYWORDS);

  if (agentMatches.length > 0) {
    return { intent: 'agent', matchedIntentKeywords: agentMatches };
  }

  if (codeMatches.length > 0) {
    return {
      intent: 'code',
      matchedIntentKeywords: codeMatches,
    };
  }

  if (generationMatches.length > 0) {
    return {
      intent: 'image_generation',
      matchedIntentKeywords: [...visualSubjectMatches, ...generationMatches],
    };
  }

  if (textOutputMatches.length > 0) {
    return { intent: 'text', matchedIntentKeywords: textOutputMatches };
  }

  if (visualSubjectMatches.length > 0 && text.includes('tasarla')) {
    return {
      intent: 'image_generation',
      matchedIntentKeywords: [...visualSubjectMatches, 'tasarla'],
    };
  }

  if (imageCount > 0 || analysisMatches.length > 0) {
    return { intent: 'image_analysis', matchedIntentKeywords: analysisMatches };
  }

  if (taskAnalysisMatches.length > 0) {
    return { intent: 'analysis', matchedIntentKeywords: taskAnalysisMatches };
  }

  if (selectedModes.includes('economy')) {
    return {
      intent: 'economy_analysis',
      matchedIntentKeywords: ['economy-mode'],
    };
  }

  if (selectedModes.includes('education')) {
    return {
      intent: 'education_content',
      matchedIntentKeywords: ['education-mode'],
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
        reason: 'The text model should plan or refine the visual prompt before generation.',
      },
      {
        adapterId: 'sdxl-image',
        reason: 'The image model should generate the final image artifact.',
      },
    ]);
  }

  return [
    {
      adapterId: 'qwen-text',
      reason: intent === 'image_analysis'
        ? 'A vision-capable text model handles multimodal image understanding.'
        : 'The text model handles reasoning, chat, code, and analysis tasks.',
    },
  ];
}

function getContractShape(intent: AillameIntent): {
  taskType: AillameTaskType;
  contentType: AillameContentType;
  outputType: AillameOutputType;
  capabilities: ModelCapability[];
} {
  if (intent === 'image_generation') {
    return {
      taskType: 'image',
      contentType: 'text',
      outputType: 'image',
      capabilities: ['image-generation' as any],
    };
  }

  if (intent === 'image_analysis') {
    return {
      taskType: 'vision',
      contentType: 'image',
      outputType: 'text',
      capabilities: ['vision-image-understanding' as any],
    };
  }

  if (intent === 'mixed_text_image') {
    return {
      taskType: 'mixed',
      contentType: 'mixed',
      outputType: 'mixed',
      capabilities: ['text-generation' as any, 'image-generation' as any],
    };
  }

  if (intent === 'code') {
    return {
      taskType: 'code',
      contentType: 'code',
      outputType: 'text',
      capabilities: ['text-generation' as any],
    };
  }

  if (intent === 'agent') {
    return {
      taskType: 'agent',
      contentType: 'project',
      outputType: 'report',
      capabilities: ['text-generation' as any],
    };
  }

  if (intent === 'analysis' || intent === 'economy_analysis') {
    return {
      taskType: 'analysis',
      contentType: 'text',
      outputType: 'report',
      capabilities: ['text-generation' as any],
    };
  }

  return {
    taskType: 'text',
    contentType: 'text',
    outputType: 'text',
    capabilities: ['text-generation' as any],
  };
}

function applyExplicitContract(
  inferred: ReturnType<typeof getContractShape>,
  input: AillameRouteInput
): ReturnType<typeof getContractShape> {
  return {
    taskType: input.taskType ?? inferred.taskType,
    contentType: input.contentType ?? inferred.contentType,
    outputType: input.outputType ?? inferred.outputType,
    capabilities: input.requiredCapabilities?.length
      ? Array.from(new Set([...inferred.capabilities, ...input.requiredCapabilities]))
      : inferred.capabilities,
  };
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
  matchedIntentKeywords: string[],
  hasExplicitRoutingHint: boolean
): number {
  const modeHits = Object.values(matchedModeKeywords).reduce(
    (total, matches) => total + (matches?.length ?? 0),
    0
  );
  const rawScore = (hasExplicitRoutingHint ? 0.7 : 0.35) + modeHits * 0.1 + matchedIntentKeywords.length * 0.12;
  return Math.min(0.95, Math.max(0.35, Number(rawScore.toFixed(2))));
}

export function routeAillameRequest(input: AillameRouteInput): AillameRouteDecision {
  const normalizedPrompt = normalizeText(input.prompt);
  const imageCount = input.imageCount ?? 0;
  const { selectedModes, primaryMode, matchedModeKeywords } = detectModes(normalizedPrompt);
  const { intent, matchedIntentKeywords } = detectIntent(
    normalizedPrompt,
    selectedModes,
    imageCount,
    input.taskType,
    input.outputType
  );
  const contractShape = applyExplicitContract(getContractShape(intent), input);
  const requiredAdapters = getRequiredAdapters(intent);
  const memoryScopes = getMemoryScopes(selectedModes, primaryMode, intent);
  const hasExplicitRoutingHint = Boolean(input.taskType || input.contentType || input.outputType || input.preferredModelId);
  const confidence = getConfidence(matchedModeKeywords, matchedIntentKeywords, hasExplicitRoutingHint);
  const selectedModelResult = selectModelForCapabilities(contractShape.capabilities, input.preferredModelId);
  const selectedModel = selectedModelResult.model;
  const warnings = selectedModelResult.warnings.length > 0 ? selectedModelResult.warnings : undefined;
  const fallbackReason = selectedModelResult.fallbackReason;
  const reason = matchedIntentKeywords.length > 0
    ? `Matched routing signals: ${matchedIntentKeywords.join(', ')}.`
    : 'Used default text routing because no stronger routing signal matched.';

  const debugMetadata: AillameDebugMetadata = {
    classifier: 'rules-v1',
    confidence,
    matchedModeKeywords,
    matchedIntentKeywords,
    notes: [
      'Rule-based router MVP; model-backed classification can replace this without changing the decision shape.',
    ],
  };

  const routingDecision = {
    taskType: contractShape.taskType,
    contentType: contractShape.contentType,
    outputType: contractShape.outputType,
    selectedRuntime: selectedModel?.runtime ?? 'not-configured',
    selectedModelId: selectedModel?.id,
    capabilities: contractShape.capabilities,
    confidence,
    fallbackReason,
    reason,
    warnings,
    diagnostics: {
      projectId: input.projectId,
      mode: primaryMode,
      requiredCapabilities: contractShape.capabilities,
      safeFallback: !selectedModel || Boolean(fallbackReason),
    },
  };

  return {
    selectedModes,
    primaryMode,
    intent,
    taskType: contractShape.taskType,
    contentType: contractShape.contentType,
    outputType: contractShape.outputType,
    selectedModelId: selectedModel?.id,
    capabilities: contractShape.capabilities as any,
    confidence,
    reason,
    warnings,
    requiredAdapters,
    memoryScopes,
    safetyFlags: {
      requiresFinancialDisclaimer: selectedModes.includes('economy') || intent === 'economy_analysis',
      containsImageInput: imageCount > 0,
      mayGenerateImage: intent === 'image_generation' || intent === 'mixed_text_image',
      allowAutomaticMemoryWrite: intent !== 'unknown',
    },
    debugMetadata,
    routingDecision,
  };
}
