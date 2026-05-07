import { PersistentMemoryAdapter, PersistenceDiagnostics } from './persistence-adapter';
import { ProjectMemoryEntry } from './project-memory-types';
import { appendJsonl, readJsonl, writeJsonl, getFileDiagnostics } from '../storage/file-store';
import { randomUUID } from 'crypto';

const SENSITIVE_PATTERNS = [
  /api[-_]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
];

function containsSensitiveData(content: string): boolean {
  return SENSITIVE_PATTERNS.some(p => p.test(content));
}

export class ProjectMemoryFileStore implements PersistentMemoryAdapter<ProjectMemoryEntry> {
  private readonly filename = 'project-memory.jsonl';

  async save(projectId: string, id: string, data: ProjectMemoryEntry): Promise<void> {
    if (containsSensitiveData(data.content)) {
      throw new Error('Sensitive content detected. Write blocked.');
    }
    
    // Simple update strategy: Since it's JSONL, we can either append all and read latest by ID,
    // or rewrite the whole file on update. For foundation, rewrite the file on update.
    const { lines, warnings } = readJsonl<ProjectMemoryEntry>(this.filename);
    const existingIdx = lines.findIndex(l => l.id === id);
    if (existingIdx >= 0) {
      lines[existingIdx] = data;
      writeJsonl(this.filename, lines);
    } else {
      appendJsonl(this.filename, data);
    }
  }

  async get(projectId: string, id: string): Promise<ProjectMemoryEntry | null> {
    const { lines } = readJsonl<ProjectMemoryEntry>(this.filename);
    const entry = lines.find(l => l.id === id && (l.projectId === projectId || l.scope === 'global'));
    return entry || null;
  }

  async list(projectId: string): Promise<ProjectMemoryEntry[]> {
    const { lines } = readJsonl<ProjectMemoryEntry>(this.filename);
    return lines.filter(l => l.projectId === projectId || l.scope === 'global');
  }

  async delete(projectId: string, id: string): Promise<boolean> {
    // Soft delete strategy for foundation
    const { lines } = readJsonl<ProjectMemoryEntry>(this.filename);
    const existingIdx = lines.findIndex(l => l.id === id && (l.projectId === projectId || l.scope === 'global'));
    if (existingIdx >= 0) {
      // Instead of removing from array, we could mark deletedAt if we extended the type,
      // but ProjectMemoryEntry doesn't have deletedAt officially yet. Let's just remove for now
      // or set a tag. We will remove it.
      lines.splice(existingIdx, 1);
      writeJsonl(this.filename, lines);
      return true;
    }
    return false;
  }

  async getDiagnostics(): Promise<PersistenceDiagnostics> {
    const diag = getFileDiagnostics(this.filename);
    return {
      status: {
        isAvailable: diag.exists,
        storeType: 'file',
        isReadOnly: false,
      },
      memoryCardCount: diag.lines,
      vectorStoreItemCount: 0,
      lastBackupAt: diag.lastWriteAt,
    };
  }
}
