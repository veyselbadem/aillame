import type { ExternalApiMode } from '@core/external-api/types';
import type { ToolDefinition, ToolName, ToolCategory, ToolRegistryEntry } from './types';

const now = Date.now();

const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: 'webResearch',
    displayName: 'Web Research',
    description: 'Web üzerinde araştırma yapar ve sonuçları admin review veya research result olarak işler.',
    category: 'research',
    riskLevel: 'medium',
    executionPolicy: 'manual_approval_required',
    implemented: true,
    enabled: true,
    requiresApproval: true,
    safetyNotes: 'Web sonuçları doğrudan memory’ye yazılmaz. ResearchResult ve admin review gerekir.',
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'researchResultCreate',
    displayName: 'Research Result Create',
    description: 'Araştırma sonuçlarını kaydetmek ve review için hazırlamak için kullanılan araç.',
    category: 'research',
    riskLevel: 'low',
    executionPolicy: 'safe_auto_allowed',
    implemented: true,
    enabled: true,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'qwenText',
    displayName: 'Qwen Text',
    description: 'Metin üretimi için Qwen tabanlı model altyapısı.',
    category: 'model',
    riskLevel: 'medium',
    executionPolicy: 'planning_only',
    implemented: false,
    enabled: false,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'sdxlImage',
    displayName: 'SDXL Image',
    description: 'SDXL tabanlı görsel üretim aracı.',
    category: 'model',
    riskLevel: 'medium',
    executionPolicy: 'planning_only',
    implemented: false,
    enabled: false,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'visionAnalyze',
    displayName: 'Vision Analyze',
    description: 'Görsel veya görüntü analizi için vision aracı.',
    category: 'model',
    riskLevel: 'medium',
    executionPolicy: 'planning_only',
    implemented: false,
    enabled: false,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'memoryRead',
    displayName: 'Memory Read',
    description: 'Hafıza içeriğini okumaya yönelik araç.',
    category: 'memory',
    riskLevel: 'medium',
    executionPolicy: 'manual_approval_required',
    implemented: false,
    enabled: false,
    requiresApproval: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'memoryCandidateCreate',
    displayName: 'Memory Candidate Create',
    description: 'Hafıza yaratıcısı aday kayıtları oluşturur.',
    category: 'memory',
    riskLevel: 'low',
    executionPolicy: 'safe_auto_allowed',
    implemented: true,
    enabled: true,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'externalGenerate',
    displayName: 'External Generate',
    description: 'Harici endpointler için genel üretim aracıdır.',
    category: 'external',
    riskLevel: 'medium',
    executionPolicy: 'planning_only',
    implemented: false,
    enabled: false,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'codeAnalyzer',
    displayName: 'Code Analyzer',
    description: 'Kod analizi ve inceleme aracı.',
    category: 'code',
    riskLevel: 'medium',
    executionPolicy: 'planning_only',
    implemented: false,
    enabled: false,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'testRunner',
    displayName: 'Test Runner',
    description: 'Test komutlarını çalıştırmak için kullanılacak araç (otomatik çalıştırılmaz).',
    category: 'testing',
    riskLevel: 'high',
    executionPolicy: 'manual_approval_required',
    implemented: false,
    enabled: false,
    requiresApproval: true,
    safetyNotes: 'Terminal komutu otomatik çalıştırılamaz. Güvenli executor gerekir.',
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'logAnalyzer',
    displayName: 'Log Analyzer',
    description: 'Log analizi ve hata incelemesi için kullanılacak araç.',
    category: 'testing',
    riskLevel: 'low',
    executionPolicy: 'safe_auto_allowed',
    implemented: false,
    enabled: false,
    requiresApproval: false,
    createdAt: now,
    updatedAt: now,
  },
];

export function listTools(): ToolDefinition[] {
  return [...TOOL_REGISTRY];
}

export function getToolByName(name: ToolName): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}

export function listEnabledTools(): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.enabled && tool.executionPolicy !== 'disabled');
}

export function listToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}

export function isToolAllowedForProject(
  toolName: ToolName,
  projectId: string,
  mode: ExternalApiMode,
): boolean {
  const tool = getToolByName(toolName);
  if (!tool) {
    return false;
  }

  if (!tool.enabled) {
    return false;
  }

  if (tool.executionPolicy === 'disabled') {
    return false;
  }

  if (tool.allowedProjectIds && !tool.allowedProjectIds.includes(projectId)) {
    return false;
  }

  if (tool.allowedModes && !tool.allowedModes.includes(mode)) {
    return false;
  }

  return true;
}
