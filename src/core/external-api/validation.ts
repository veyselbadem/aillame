import type {
  ExternalAillameAttachment,
  ExternalAillameRequest,
  ExternalAillameRequest as ExternalRequest,
  ExternalAillameResponse,
  ExternalApiMode,
} from './types';
import { getExternalProjectConfig, isValidExternalProjectId } from './project-config';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isValidAttachment(value: unknown): value is ExternalAillameAttachment {
  if (!isPlainObject(value)) return false;
  if (!isString(value.id) || !isString(value.type)) return false;
  if (value.filename !== undefined && !isString(value.filename)) return false;
  if (value.mimeType !== undefined && !isString(value.mimeType)) return false;
  if (value.url !== undefined && !isString(value.url)) return false;
  return true;
}

export type ExternalAillameRequestValidationResult =
  | { success: true; request: ExternalAillameRequest }
  | { success: false; error: string };

export function validateExternalAillameRequest(payload: unknown): ExternalAillameRequestValidationResult {
  if (!isPlainObject(payload)) {
    return { success: false, error: 'Payload must be an object.' };
  }

  const projectId = payload.projectId;
  if (!isString(projectId) || !isValidExternalProjectId(projectId)) {
    return { success: false, error: 'Invalid projectId.' };
  }

  const config = getExternalProjectConfig(projectId);
  const message = payload.message;
  if (!isString(message) || message.trim().length === 0) {
    return { success: false, error: 'message is required.' };
  }

  const mode = payload.mode;
  let resolvedMode: ExternalApiMode = config.defaultMode;
  if (mode !== undefined) {
    if (!isString(mode)) {
      return { success: false, error: 'mode must be a string.' };
    }
    if (!config.allowedModes.includes(mode as ExternalApiMode)) {
      return { success: false, error: 'mode is not allowed for the selected project.' };
    }
    resolvedMode = mode as ExternalApiMode;
  }

  const context = payload.context;
  if (context !== undefined && !isPlainObject(context)) {
    return { success: false, error: 'context must be an object.' };
  }

  const attachments = payload.attachments;
  if (attachments !== undefined) {
    if (!Array.isArray(attachments)) {
      return { success: false, error: 'attachments must be an array.' };
    }
    for (const attachment of attachments) {
      if (!isValidAttachment(attachment)) {
        return { success: false, error: 'Each attachment must contain id and type, and use safe string fields.' };
      }
    }
  }

  const sessionId = payload.sessionId;
  if (sessionId !== undefined && !isString(sessionId)) {
    return { success: false, error: 'sessionId must be a string.' };
  }

  const requestId = payload.requestId;
  if (requestId !== undefined && !isString(requestId)) {
    return { success: false, error: 'requestId must be a string.' };
  }

  return {
    success: true,
    request: {
      projectId,
      mode: resolvedMode,
      message: message.trim(),
      context: context as Record<string, unknown> | undefined,
      attachments: attachments as ExternalAillameAttachment[] | undefined,
      sessionId,
      requestId,
    },
  };
}
