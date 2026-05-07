export type ApiKeyScope = "global" | "project-scoped";

export type ApiKeyPermission = 
  | "chat:read"
  | "chat:write"
  | "project:read"
  | "memory:read"
  | "memory:write"
  | "task:create"
  | "task:read"
  | "runtime:read"
  | "admin:read"
  | "admin:write";

export interface ProjectPermission {
  projectId: string;
  permissions: ApiKeyPermission[];
}

export type ApiKeyStatus = "active" | "revoked" | "expired" | "disabled";

export interface AillameApiKey {
  id: string;
  label: string;
  scope: ApiKeyScope;
  projectIds: string[]; // Projects this key can access
  permissions: ApiKeyPermission[];
  status: ApiKeyStatus;
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
  revokedAt?: number;
  maskedKey: string; // e.g. "ail_...1234"
}

export interface AillameApiKeyRecord extends AillameApiKey {
  keyHash: string; // Hashed plaintext key
  keyPrefix: string; // e.g. "ail_"
}

export interface CreateApiKeyRequest {
  label: string;
  projectIds?: string[];
  permissions?: ApiKeyPermission[];
  expiresInDays?: number;
}

export interface CreateApiKeyResult {
  success: boolean;
  apiKey?: AillameApiKey;
  plaintextKey?: string; // ONLY returned once upon creation
  error?: string;
}

export interface ListApiKeysRequest {
  status?: ApiKeyStatus;
}

export interface RevokeApiKeyRequest {
  keyId: string;
}

export interface PermissionCheckRequest {
  apiKey?: AillameApiKey;
  projectId?: string;
  requiredScope: ApiKeyPermission;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface SecurityDiagnostics {
  authEnabled: boolean;
  missingKeyAction: "reject" | "allow-in-dev";
  activeKeysCount: number;
  revokedKeysCount: number;
  lastBackupAt?: number;
}
