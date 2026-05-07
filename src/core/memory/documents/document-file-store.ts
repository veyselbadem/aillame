import fs from 'fs';
import path from 'path';
import { DocumentLibraryEntry } from './document-types';

export class DocumentLibraryFileStore {
  private filePath: string;

  constructor(dataDir: string = '.aillame-data') {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'document-library.jsonl');
  }

  async addEntry(entry: DocumentLibraryEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile(this.filePath, line);
  }

  async listEntries(projectId?: string): Promise<DocumentLibraryEntry[]> {
    if (!fs.existsSync(this.filePath)) return [];

    const content = await fs.promises.readFile(this.filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const entries: DocumentLibraryEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as DocumentLibraryEntry;
        if (!projectId || entry.projectId === projectId) {
          entries.push(entry);
        }
      } catch (err) {
        console.warn('Corrupt line in document library:', err);
      }
    }

    return entries;
  }

  async updateEntryStatus(documentId: string, status: DocumentLibraryEntry['status']): Promise<boolean> {
    const entries = await this.listEntries();
    let found = false;
    const updated = entries.map(e => {
      if (e.documentId === documentId) {
        found = true;
        return { ...e, status, updatedAt: Date.now(), deletedAt: status === 'deleted' ? Date.now() : e.deletedAt };
      }
      return e;
    });

    if (found) {
      await fs.promises.writeFile(this.filePath, updated.map(e => JSON.stringify(e)).join('\n') + '\n');
    }
    return found;
  }

  async getEntry(documentId: string): Promise<DocumentLibraryEntry | null> {
    const entries = await this.listEntries();
    return entries.find(e => e.documentId === documentId) || null;
  }
}

export const documentLibraryStore = new DocumentLibraryFileStore();
