import { NextRequest, NextResponse } from 'next/server';
import type { ApiClient } from '@core/api-clients/types';
import {
  verifyApiClientKey,
  assertClientCanUseProject,
  assertClientCanUseMode,
  assertClientCanUseTask,
  assertClientCanUseTool,
} from '@core/api-clients/service';
import type { ExternalApiMode } from '@core/external-api/types';

const LEGACY_CONFIG_KEY = 'AILLAME_EXTERNAL_API_KEY';
const LEGACY_CLIENT_ID = 'ac_legacy_external_key';

export type ExternalClientAuthResult = {
  success: boolean;
  client?: Omit<ApiClient, 'apiKeyHash'>;
  error?: string;
  statusCode?: number;
  rateLimitRemaining?: number;
  rateLimitResetAt?: number;
  authWarning?: string;
};

export function getExternalApiKeyFromRequest(request: NextRequest): string | undefined {
  const headerValue = request.headers.get('x-aillame-api-key');
  if (headerValue?.trim()) {
    return headerValue.trim();
  }

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  return undefined;
}

function createLegacyExternalClient(): ApiClient {
  return {
    id: LEGACY_CLIENT_ID,
    clientId: 'legacy-external-key',
    projectId: 'legacy',
    displayName: 'Legacy External Key',
    ownerType: 'external_app',
    apiKeyHash: '',
    apiKeyPrefix: 'legacy',
    allowedModes: ['general'],
    allowedTasks: [],
    allowedTools: [],
    rateLimitProfile: 'standard',
    memoryPolicy: {
      allowGlobalRead: false,
      allowGlobalWrite: false,
      allowProjectMemory: true,
      allowClientMemory: true,
      allowSessionMemory: true,
      allowTaskMemory: true,
      allowMemoryWriteQueueOnly: true,
    },
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function sanitizeExternalClient(client: ApiClient) {
  const { apiKeyHash, ...safeClient } = client;
  return safeClient;
}

import { checkRateLimit } from '@core/rate-limit/service';

export async function validateExternalClientRequest(request: NextRequest): Promise<ExternalClientAuthResult> {
  const rawKey = getExternalApiKeyFromRequest(request);
  if (!rawKey) {
    return {
      success: false,
      error: 'Unauthorized external client request.',
      statusCode: 401,
    };
  }

  const authResult = await verifyApiClientKey(rawKey);
  let client: ApiClient | undefined;

  if (authResult.success && authResult.client) {
    client = authResult.client;
  } else {
    const legacyKey = process.env[LEGACY_CONFIG_KEY]?.trim();
    if (legacyKey && rawKey === legacyKey) {
      client = createLegacyExternalClient();
    }
  }

  if (client) {
    // Enforcement: Rate Limit
    const rlStatus = await checkRateLimit(client.id, client.rateLimitProfile);
    if (rlStatus.isExceeded) {
      console.warn(`[RATE_LIMIT] Client ${client.clientId} exceeded limit.`);
      return {
        success: false,
        error: 'Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.',
        statusCode: 429,
        rateLimitRemaining: rlStatus.remaining,
        rateLimitResetAt: rlStatus.resetAt,
      };
    }
    
    return {
      success: true,
      client: sanitizeExternalClient(client),
      rateLimitRemaining: rlStatus.remaining,
      rateLimitResetAt: rlStatus.resetAt,
      authWarning: client.id === LEGACY_CLIENT_ID ? 'legacy-external-key' : undefined,
    };
  }

  if (authResult.statusCode === 403) {
    return {
      success: false,
      error: authResult.error || 'External client is not allowed to access this resource.',
      statusCode: 403,
    };
  }

  return {
    success: false,
    error: authResult.error || 'Unauthorized external client request.',
    statusCode: authResult.statusCode || 401,
  };
}

export function createExternalAuthErrorResponse(message: string, statusCode = 401): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: statusCode });
}

export type ExternalClient = Omit<ApiClient, 'apiKeyHash'>;

export function assertExternalClientProjectAccess(client: ExternalClient, projectId: string): boolean {
  return assertClientCanUseProject(client as ApiClient, projectId);
}

export function assertExternalClientModeAccess(client: ExternalClient, mode?: string): boolean {
  if (!mode) {
    return true;
  }
  return assertClientCanUseMode(client as ApiClient, mode);
}

export function assertExternalClientTaskAccess(client: ExternalClient, task?: string): boolean {
  if (!task) {
    return true;
  }
  return assertClientCanUseTask(client as ApiClient, task);
}

export function assertExternalClientToolAccess(client: ExternalClient, tool?: string): boolean {
  if (!tool) {
    return true;
  }
  return client.allowedTools.length > 0 && client.allowedTools.includes(tool);
}
