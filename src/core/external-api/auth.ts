import { NextRequest } from 'next/server';
import type { ExternalApiAuthResult } from './types';
import {
  assertExternalClientModeAccess,
  assertExternalClientProjectAccess,
  type ExternalClient,
  validateExternalClientRequest,
} from '@core/external-auth/client-auth';
import type { ExternalProviderNormalizedContext } from './provider-contract';

export type ExternalApiRequestAuthResult = Awaited<ReturnType<typeof validateExternalClientRequest>>;

export async function validateExternalApiRequest(request: NextRequest): Promise<ExternalApiRequestAuthResult> {
  return validateExternalClientRequest(request);
}

export function assertExternalApiContextAccess(
  client: ExternalClient,
  context: Pick<ExternalProviderNormalizedContext, 'projectId' | 'mode'>,
): { success: true } | { success: false; error: string; statusCode: 403 } {
  if (context.projectId && !assertExternalClientProjectAccess(client, context.projectId)) {
    return {
      success: false,
      error: `External client cannot access project '${context.projectId}'.`,
      statusCode: 403,
    };
  }

  if (context.mode && !assertExternalClientModeAccess(client, context.mode)) {
    return {
      success: false,
      error: `External client cannot access mode '${context.mode}'.`,
      statusCode: 403,
    };
  }

  return { success: true };
}

export function createExternalApiResponseHeaders(result: Partial<ExternalApiRequestAuthResult>): HeadersInit {
  const headers = new Headers();
  headers.set('x-aillame-rate-limit-policy', 'best-effort-memory');

  if (typeof result.rateLimitRemaining === 'number') {
    headers.set('x-ratelimit-remaining', String(result.rateLimitRemaining));
  }

  if (typeof result.rateLimitResetAt === 'number') {
    headers.set('x-ratelimit-reset-at', String(result.rateLimitResetAt));
  }

  if (result.authWarning) {
    headers.set('x-aillame-auth-warning', result.authWarning);
  }

  return headers;
}

export async function validateExternalApiKey(request: NextRequest): Promise<ExternalApiAuthResult> {
  const authResult = await validateExternalApiRequest(request);
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
