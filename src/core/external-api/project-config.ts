import type { ExternalProjectConfig, ExternalProjectId } from './types';

export const EXTERNAL_API_PROJECT_CONFIGS: Record<ExternalProjectId, ExternalProjectConfig> = {
  'boss-ai': {
    projectId: 'boss-ai',
    displayName: 'BOSS AI',
    allowedModes: ['economy', 'general'],
    defaultMode: 'economy',
    rateLimitProfile: 'standard',
    memoryPolicy: {
      projectMemory: true,
      modeMemory: true,
      globalMemory: false,
    },
  },
  'doomsgame-engine': {
    projectId: 'doomsgame-engine',
    displayName: 'Doomsgame Engine',
    allowedModes: ['code', 'general', 'image_generation'],
    defaultMode: 'code',
    rateLimitProfile: 'standard',
    memoryPolicy: {
      projectMemory: true,
      modeMemory: true,
      globalMemory: false,
    },
  },
  'doomsgame': {
    projectId: 'doomsgame',
    displayName: 'Doomsgame',
    allowedModes: ['content', 'general'],
    defaultMode: 'content',
    rateLimitProfile: 'standard',
    memoryPolicy: {
      projectMemory: true,
      modeMemory: true,
      globalMemory: false,
    },
  },
  'egitim-web': {
    projectId: 'egitim-web',
    displayName: 'Eğitim Web',
    allowedModes: ['education', 'general', 'image_generation'],
    defaultMode: 'education',
    rateLimitProfile: 'standard',
    memoryPolicy: {
      projectMemory: true,
      modeMemory: true,
      globalMemory: false,
    },
  },
  'aillame-local': {
    projectId: 'aillame-local',
    displayName: 'Aillame Local',
    allowedModes: ['general', 'code', 'education', 'economy', 'image_generation'],
    defaultMode: 'general',
    rateLimitProfile: 'trusted',
    memoryPolicy: {
      projectMemory: false,
      modeMemory: true,
      globalMemory: true,
    },
  },
};

export function isValidExternalProjectId(projectId: string): projectId is ExternalProjectId {
  return projectId === 'boss-ai'
    || projectId === 'doomsgame'
    || projectId === 'doomsgame-engine'
    || projectId === 'egitim-web'
    || projectId === 'aillame-local';
}

export function getExternalProjectConfig(projectId: ExternalProjectId): ExternalProjectConfig {
  return EXTERNAL_API_PROJECT_CONFIGS[projectId];
}
