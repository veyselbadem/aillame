import type { AillameRouteInput } from '../aillame-router/types';
import type { ExternalAillameRequest, ExternalProjectId } from './types';
import type { ExternalMemoryScopePlan } from './memory-scope';
import { getExternalProjectConfig } from './project-config';
import { resolveExternalMemoryScopePlan } from './memory-scope';

export type ExternalAillameRouterAdaptation = {
  routeInput: AillameRouteInput;
  projectId: ExternalProjectId;
  resolvedMode: string;
  routeMetadata: {
    requestId?: string;
    sessionId?: string;
    memoryScopes: ExternalMemoryScopePlan;
    attachmentMimeTypes?: string[];
  };
};

export function adaptExternalRequestForAillameRouter(
  request: ExternalAillameRequest
): ExternalAillameRouterAdaptation {
  const config = getExternalProjectConfig(request.projectId);
  const resolvedMode = request.mode ?? config.defaultMode;
  const attachmentMimeTypes = request.attachments
    ? request.attachments.map((attachment) => attachment.mimeType).filter((value): value is string => typeof value === 'string')
    : undefined;

  const routeInput: AillameRouteInput = {
    prompt: request.message,
    attachmentMimeTypes,
  };

  const memoryScopes = resolveExternalMemoryScopePlan(request, config);

  return {
    routeInput,
    projectId: request.projectId,
    resolvedMode,
    routeMetadata: {
      requestId: request.requestId,
      sessionId: request.sessionId,
      memoryScopes,
      attachmentMimeTypes,
    },
  };
}
