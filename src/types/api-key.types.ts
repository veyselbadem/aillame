export interface AillameApiKeyRecord {
  id: string;
  name: string;
  keyHash: string;
  projectId: string;
  allowedModes: string[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AillameAuthContext {
  keyId: string;
  name: string;
  projectId: string;
  allowedModes: string[];
}
