import type { ExternalApiMode } from '@core/external-api/types';

export type ApiClientOwnerType = 'personal' | 'internal_project' | 'external_app' | 'third_party';

export type ApiClientStatus = 'active' | 'suspended' | 'revoked';

export type ApiClientRateLimitProfile = 'low' | 'standard' | 'trusted' | 'unlimited_local';

export type ApiClientMemoryPolicy = {
  allowGlobalRead: boolean;
  allowGlobalWrite: boolean;
  allowProjectMemory: boolean;
  allowClientMemory: boolean;
  allowSessionMemory: boolean;
  allowTaskMemory: boolean;
  allowMemoryWriteQueueOnly: boolean;
};

export type ApiClient = {
  id: string;
  clientId: string;
  projectId: string;
  displayName: string;
  description?: string;
  ownerType: ApiClientOwnerType;
  apiKeyHash: string;
  apiKeyPrefix: string;
  allowedModes: ExternalApiMode[];
  allowedTasks: string[];
  allowedTools: string[];
  rateLimitProfile: ApiClientRateLimitProfile;
  memoryPolicy: ApiClientMemoryPolicy;
  status: ApiClientStatus;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  revokedAt?: number;
  notes?: string;
};

export type CreateApiClientInput = {
  projectId: string;
  displayName: string;
  description?: string;
  ownerType: ApiClientOwnerType;
  allowedModes: ExternalApiMode[];
  allowedTasks: string[];
  allowedTools: string[];
  rateLimitProfile?: ApiClientRateLimitProfile;
  memoryPolicy?: Partial<ApiClientMemoryPolicy>;
  notes?: string;
};

export type CreateApiClientResult = {
  client: ApiClient;
  rawApiKey: string;
};

export type UpdateApiClientInput = {
  displayName?: string;
  description?: string;
  allowedModes?: ExternalApiMode[];
  allowedTasks?: string[];
  allowedTools?: string[];
  rateLimitProfile?: ApiClientRateLimitProfile;
  memoryPolicy?: Partial<ApiClientMemoryPolicy>;
  status?: ApiClientStatus;
  notes?: string;
};

export type VerifyApiClientResult = {
  success: boolean;
  client?: ApiClient;
  error?: string;
  statusCode?: number;
};
