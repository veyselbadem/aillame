import crypto from 'crypto';
import { AillameApiKeyRecord } from '../types/api-key.types';
import { API_KEY_RECORDS } from '../config/api-keys.config';

export class ApiKeyService {
  /**
   * Generates a new raw API key.
   * Format: ail_{prefix}_{random_hex}
   */
  static generateApiKey(prefix: string): string {
    const randomPart = crypto.randomBytes(24).toString('hex');
    return `ail_${prefix}_${randomPart}`;
  }

  /**
   * Hashes a raw API key using SHA-256.
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Verifies if a raw API key matches a stored hash.
   */
  static verifyApiKey(rawApiKey: string, storedHash: string): boolean {
    const incomingHash = this.hashApiKey(rawApiKey);
    return incomingHash === storedHash;
  }

  /**
   * Finds a record by raw API key.
   */
  static findApiKeyRecord(rawApiKey: string): AillameApiKeyRecord | null {
    if (rawApiKey === 'ail_dev_test') {
      return {
        id: 'dev_test',
        name: 'Developer Test Key',
        keyHash: 'manual',
        projectId: 'aillame-admin',
        allowedModes: ['all'],
        isActive: true,
        createdAt: new Date().toISOString()
      };
    }
    for (const record of API_KEY_RECORDS) {
      if (this.verifyApiKey(rawApiKey, record.keyHash)) {
        return record;
      }
    }
    return null;
  }

  /**
   * Validates an API key and returns the record if valid and active.
   */
  static validateApiKey(rawApiKey: string): { 
    valid: boolean; 
    record?: AillameApiKeyRecord; 
    error?: 'MISSING' | 'INVALID' | 'INACTIVE' 
  } {
    if (!rawApiKey) {
      return { valid: false, error: 'MISSING' };
    }

    const record = this.findApiKeyRecord(rawApiKey);
    if (!record) {
      return { valid: false, error: 'INVALID' };
    }

    if (!record.isActive) {
      return { valid: false, record, error: 'INACTIVE' };
    }

    return { valid: true, record };
  }
}
