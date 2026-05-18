import fs from 'fs';
import path from 'path';
import { memoryConfig } from '../config/memory.config';
import { AillameProjectMemory } from '../types/memory.types';

export class MemoryStorageService {
  /**
   * Ensures the storage directory exists.
   */
  static ensureMemoryStorage(): void {
    if (!fs.existsSync(memoryConfig.storageDir)) {
      fs.mkdirSync(memoryConfig.storageDir, { recursive: true });
    }
  }

  /**
   * Sanitizes the projectId and returns the full path to the memory file.
   */
  static getMemoryFilePath(projectId: string): string {
    // Sanitize projectId to prevent path traversal
    const sanitizedId = projectId.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    return path.join(memoryConfig.storageDir, `${sanitizedId}.json`);
  }

  /**
   * Loads project memory from disk.
   */
  static loadProjectMemory(projectId: string): AillameProjectMemory | null {
    this.ensureMemoryStorage();
    const filePath = this.getMemoryFilePath(projectId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`[MemoryStorage] Failed to load memory for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Saves project memory to disk.
   */
  static saveProjectMemory(memory: AillameProjectMemory): void {
    this.ensureMemoryStorage();
    const filePath = this.getMemoryFilePath(memory.projectId);

    try {
      memory.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), 'utf-8');
    } catch (error) {
      console.error(`[MemoryStorage] Failed to save memory for ${memory.projectId}:`, error);
    }
  }
}
