import crypto from 'crypto';
import { 
  AillameApiKey, 
  AillameApiKeyRecord, 
  CreateApiKeyRequest, 
  CreateApiKeyResult,
  ApiKeyStatus
} from './models';
import { ApiKeyFileStore } from './api-key-file-store';

export class ApiKeyService {
  private store = new ApiKeyFileStore();
  private readonly HASH_ALGORITHM = 'sha256';
  private readonly KEY_PREFIX = 'ail_';

  // Secret for hashing (In production, this would be an env var)
  private getSecret(): string {
    return process.env.AILLAME_API_KEY_HASH_SECRET || 'aillame-default-foundation-secret';
  }

  createApiKey(request: CreateApiKeyRequest): CreateApiKeyResult {
    try {
      const plaintextKey = this.generatePlaintextKey();
      const keyId = crypto.randomUUID();
      const keyHash = this.hashKey(plaintextKey);
      
      const createdAt = Date.now();
      let expiresAt: number | undefined;
      if (request.expiresInDays) {
        expiresAt = createdAt + (request.expiresInDays * 24 * 60 * 60 * 1000);
      }

      const apiKey: AillameApiKey = {
        id: keyId,
        label: request.label,
        scope: request.projectIds && request.projectIds.length > 0 ? "project-scoped" : "global",
        projectIds: request.projectIds || [],
        permissions: request.permissions || ["chat:write", "project:read"],
        status: "active",
        createdAt,
        expiresAt,
        maskedKey: this.maskKey(plaintextKey)
      };

      const record: AillameApiKeyRecord = {
        ...apiKey,
        keyHash,
        keyPrefix: this.KEY_PREFIX
      };

      this.store.saveKey(record);

      return {
        success: true,
        apiKey,
        plaintextKey
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  listApiKeys(status?: ApiKeyStatus): AillameApiKey[] {
    const records = this.store.listKeys(status);
    // Strip hash and prefix for safety
    return records.map(r => {
      const { keyHash, keyPrefix, ...rest } = r;
      return rest;
    });
  }

  revokeApiKey(keyId: string): boolean {
    const record = this.store.getKey(keyId);
    if (!record || record.status === 'revoked') return false;

    const updatedRecord: AillameApiKeyRecord = {
      ...record,
      status: 'revoked',
      revokedAt: Date.now()
    };

    this.store.saveKey(updatedRecord);
    return true;
  }

  verifyApiKey(plaintextKey: string): AillameApiKey | null {
    if (!plaintextKey || !plaintextKey.startsWith(this.KEY_PREFIX)) return null;

    const hash = this.hashKey(plaintextKey);
    const records = this.store.listKeys('active');
    
    const match = records.find(r => r.keyHash === hash);
    if (!match) return null;

    // Check expiration
    if (match.expiresAt && match.expiresAt < Date.now()) {
      // Auto-disable or just return null
      return null;
    }

    const { keyHash, keyPrefix, ...safeKey } = match;
    return safeKey;
  }

  private generatePlaintextKey(): string {
    const randomBody = crypto.randomBytes(24).toString('hex');
    return `${this.KEY_PREFIX}${randomBody}`;
  }

  private hashKey(plaintext: string): string {
    return crypto
      .createHmac(this.HASH_ALGORITHM, this.getSecret())
      .update(plaintext)
      .digest('hex');
  }

  private maskKey(plaintext: string): string {
    const body = plaintext.replace(this.KEY_PREFIX, '');
    if (body.length < 8) return `${this.KEY_PREFIX}...`;
    return `${this.KEY_PREFIX}${body.substring(0, 4)}...${body.substring(body.length - 4)}`;
  }

  getDiagnostics() {
    return this.store.getDiagnostics();
  }
}
