import { NextRequest } from 'next/server';
import { ApiKeyService } from './api-key-service';
import { PermissionService } from './permission-service';
import { ApiKeyPermission } from './models';
import { AuditFileStore } from './audit-file-store';
import { randomUUID } from 'crypto';

const apiKeyService = new ApiKeyService();
const permissionService = new PermissionService();
const auditStore = new AuditFileStore();

export interface AuthGuardResult {
  allowed: boolean;
  apiKey?: any;
  errorResponse?: {
    status: number;
    body: any;
  };
}

export async function externalApiAuthGuard(
  req: NextRequest, 
  requiredScope: ApiKeyPermission,
  projectId?: string
): Promise<AuthGuardResult> {
  const isAuthRequired = permissionService.shouldEnforceAuth();
  const requestId = randomUUID();

  // 1. Extract API key
  const authHeader = req.headers.get('Authorization');
  const xApiKey = req.headers.get('x-aillame-api-key');
  
  let plaintextKey: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    plaintextKey = authHeader.substring(7);
  } else if (xApiKey) {
    plaintextKey = xApiKey;
  }

  // 2. If auth not required (Dev mode), allow with warnings
  if (!isAuthRequired) {
    if (!plaintextKey) {
      return { allowed: true };
    }
  }

  // 3. Verify Key
  if (!plaintextKey) {
    logAuthFailed(requestId, "missing_key", projectId);
    return {
      allowed: false,
      errorResponse: {
        status: 401,
        body: {
          success: false,
          requestId,
          error: {
            code: "unauthorized",
            message: "Missing API key. Use Authorization: Bearer <key> or x-aillame-api-key header."
          }
        }
      }
    };
  }

  const apiKey = apiKeyService.verifyApiKey(plaintextKey);
  if (!apiKey) {
    logAuthFailed(requestId, "invalid_key", projectId);
    return {
      allowed: false,
      errorResponse: {
        status: 401,
        body: {
          success: false,
          requestId,
          error: {
            code: "unauthorized",
            message: "Invalid or revoked API key."
          }
        }
      }
    };
  }

  // 4. Check Permissions
  const permission = permissionService.checkPermission({
    apiKey,
    projectId,
    requiredScope
  });

  if (!permission.allowed) {
    logAuthFailed(requestId, "forbidden", projectId, apiKey.id, permission.reason);
    return {
      allowed: false,
      errorResponse: {
        status: 403,
        body: {
          success: false,
          requestId,
          error: {
            code: "forbidden",
            message: permission.reason || "Insufficient permissions."
          }
        }
      }
    };
  }

  return { allowed: true, apiKey };
}

function logAuthFailed(requestId: string, reason: string, projectId?: string, keyId?: string, detail?: string) {
  auditStore.appendAuditEvent({
    id: randomUUID(),
    timestamp: Date.now(),
    actor: { type: "api-key", id: keyId || "unknown" },
    action: "security.auth.failed",
    resource: { type: "project", projectId: projectId || "general" },
    severity: "warning",
    sanitized: true,
    details: { requestId, reason, detail }
  });
}
