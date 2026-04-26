import type { ExternalAillameRequest, ExternalProjectConfig } from './types';

export type ExternalMemoryScopePlan = Array<{
  scope: string;
  required: boolean;
  reason: string;
}>;

export function resolveExternalMemoryScopePlan(
  request: ExternalAillameRequest,
  config: ExternalProjectConfig
): ExternalMemoryScopePlan {
  const mode = request.mode ?? config.defaultMode;
  const scopes: ExternalMemoryScopePlan = [];

  scopes.push({
    scope: `project:${config.projectId}`,
    required: true,
    reason: 'Project-level memory scope provides project-specific context.',
  });

  scopes.push({
    scope: `mode:${mode}`,
    required: true,
    reason: 'Mode-level memory scope provides mode-specific knowledge and preferences.',
  });

  if (request.sessionId) {
    scopes.push({
      scope: `session:${request.sessionId}`,
      required: false,
      reason: 'Session scope helps preserve conversation continuity when available.',
    });
  }

  if (config.memoryPolicy.globalMemory) {
    scopes.push({
      scope: 'global',
      required: true,
      reason: 'Global memory is allowed for system-level context and safe reference.',
    });
  } else if (config.projectId === 'boss-ai' && mode === 'economy') {
    scopes.push({
      scope: 'global',
      required: false,
      reason: 'Global memory read is optional for boss-ai economy requests to reduce sensitive write exposure.',
    });
  }

  return scopes;
}
