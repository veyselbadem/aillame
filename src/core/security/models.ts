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

export interface AillameApiKey {
  id: string;
  name: string;
  scope: ApiKeyScope;
  globalPermissions: ApiKeyPermission[];
  projectPermissions: ProjectPermission[];
  createdAt: number;
  lastUsedAt?: number;
  isActive: boolean;
}

export interface PermissionCheckRequest {
  keyId?: string;
  projectId?: string;
  requiredPermissions: ApiKeyPermission[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface SecurityDiagnostics {
  authEnabled: boolean;
  missingKeyAction: "reject" | "allow-in-dev";
  activeKeysCount: number;
}
