import type { ProviderApiRequest } from './types';

export function validateProviderApiRequest(body: any): { success: true; request: ProviderApiRequest } | { success: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body.' };
  }

  if (!body.projectId || typeof body.projectId !== 'string') {
    return { success: false, error: 'Missing or invalid projectId.' };
  }

  if (body.mode === 'text') {
    if (!body.prompt && (!body.messages || !Array.isArray(body.messages))) {
      return { success: false, error: 'Text mode requires either a prompt or messages array.' };
    }
    return { success: true, request: body as ProviderApiRequest };
  } else if (body.mode === 'image') {
    if (!body.prompt || typeof body.prompt !== 'string') {
      return { success: false, error: 'Image mode requires a prompt string.' };
    }
    return { success: true, request: body as ProviderApiRequest };
  }

  return { success: false, error: 'Invalid or missing mode. Must be "text" or "image".' };
}
