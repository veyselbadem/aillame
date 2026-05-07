import { AillameApiKeyRecord, ApiKeyStatus } from './models';
import { readJsonl, writeJsonl, appendJsonl, getFileDiagnostics } from '../storage/file-store';

export class ApiKeyFileStore {
  private readonly filename = 'api-keys.jsonl';

  saveKey(record: AillameApiKeyRecord): void {
    // If updating existing (e.g. revoke), we rewrite the file for now as foundation simplicity.
    // In larger systems, we'd use a better storage, but for Phase 2 JSONL rewrite is okay.
    const { lines } = readJsonl<AillameApiKeyRecord>(this.filename);
    const existingIdx = lines.findIndex(l => l.id === record.id);
    
    if (existingIdx >= 0) {
      lines[existingIdx] = record;
      writeJsonl(this.filename, lines);
    } else {
      appendJsonl(this.filename, record);
    }
  }

  listKeys(status?: ApiKeyStatus): AillameApiKeyRecord[] {
    const { lines } = readJsonl<AillameApiKeyRecord>(this.filename);
    if (status) {
      return lines.filter(l => l.status === status);
    }
    return lines;
  }

  getKey(id: string): AillameApiKeyRecord | null {
    const { lines } = readJsonl<AillameApiKeyRecord>(this.filename);
    return lines.find(l => l.id === id) || null;
  }

  getDiagnostics() {
    const diag = getFileDiagnostics(this.filename);
    const { lines } = readJsonl<AillameApiKeyRecord>(this.filename);
    
    return {
      exists: diag.exists,
      totalKeys: diag.lines,
      activeKeys: lines.filter(l => l.status === 'active').length,
      revokedKeys: lines.filter(l => l.status === 'revoked').length,
      lastUpdateAt: diag.lastWriteAt
    };
  }
}
