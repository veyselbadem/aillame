import { NextRequest } from 'next/server';
import type { ExternalApiAuthResult } from './types';
import { validateExternalClientRequest } from '@core/external-auth/client-auth';

export async function validateExternalApiKey(request: NextRequest): Promise<ExternalApiAuthResult> {
  const authResult = await validateExternalClientRequest(request);
  if (authResult.success) {
    return { success: true };
  }

  const isForbidden = authResult.statusCode === 403;
  return {
    success: false,
    error: isForbidden
      ? 'External client is not allowed to access this resource.'
      : 'Unauthorized external client request.',
  };
}
