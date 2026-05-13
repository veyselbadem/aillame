import { 
  AillameProjectMemory, 
  AillameMemoryContext, 
  AillameMemoryFact, 
  AillameMemoryMessage 
} from '../types/memory.types';
import { memoryConfig } from '../config/memory.config';
import { MemoryStorageService } from './memory-storage.service';
import crypto from 'crypto';

export class MemoryService {
  /**
   * Loads the memory context for a project.
   */
  static getMemoryContext(projectId: string): AillameMemoryContext {
    if (!memoryConfig.enabled) {
      return {
        projectId,
        facts: [],
        recentMessages: [],
        meta: { factCount: 0, recentMessageCount: 0, loadedAt: new Date().toISOString() }
      };
    }

    const memory = this.initializeProjectMemoryIfMissing(projectId);

    return {
      projectId: memory.projectId,
      facts: memory.facts,
      recentMessages: memory.recentMessages,
      meta: {
        factCount: memory.facts.length,
        recentMessageCount: memory.recentMessages.length,
        loadedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Initializes memory for a project if it doesn't exist.
   * Adds default facts for doomsgame-engine.
   */
  static initializeProjectMemoryIfMissing(projectId: string): AillameProjectMemory {
    let memory = MemoryStorageService.loadProjectMemory(projectId);

    if (!memory) {
      memory = {
        projectId,
        facts: [],
        recentMessages: [],
        updatedAt: new Date().toISOString()
      };

      // Add default facts for doomsgame-engine
      if (projectId === 'doomsgame-engine') {
        const defaultFacts = [
          "Doomsgame Engine, Aillame’ye API URL ve API Key ile bağlanacak.",
          "Doomsgame Engine içinde projectId sabit olarak doomsgame-engine kullanılacak.",
          "Doomsgame Engine için varsayılan mode code olarak kullanılacak.",
          "Aillame bağımsız yerel AI sistemi olarak çalışacak; Ollama zorunlu değildir.",
          "Aillame cevapları Doomsgame’de kullanıcı onayı olmadan otomatik uygulanmayacak.",
          "Aillame safety.canAutoApply değerini her zaman false tutmalıdır."
        ];

        defaultFacts.forEach(text => {
          memory!.facts.push({
            id: `fact_${crypto.randomBytes(4).toString('hex')}`,
            text,
            tags: ["system", "default"],
            createdAt: new Date().toISOString()
          });
        });
      }

      MemoryStorageService.saveProjectMemory(memory);
    }

    return memory;
  }

  /**
   * Adds a fact to the project memory.
   */
  static addMemoryFact(projectId: string, text: string, tags: string[] = []): AillameProjectMemory {
    const memory = this.initializeProjectMemoryIfMissing(projectId);

    if (!text || text.trim() === "") return memory;

    // Check for duplicates
    const exists = memory.facts.some(f => f.text.toLowerCase() === text.toLowerCase());
    if (exists) return memory;

    // Limit facts
    if (memory.facts.length >= memoryConfig.maxFactsPerProject) {
      memory.facts.shift(); // Remove oldest
    }

    memory.facts.push({
      id: `fact_${crypto.randomBytes(4).toString('hex')}`,
      text: text.trim(),
      tags,
      createdAt: new Date().toISOString()
    });

    MemoryStorageService.saveProjectMemory(memory);
    return memory;
  }

  /**
   * Adds a message to the recent messages list.
   */
  static addRecentMessage(input: {
    projectId: string;
    role: "user" | "assistant";
    content: string;
    mode: string;
    taskType?: string;
  }): AillameProjectMemory {
    const memory = this.initializeProjectMemoryIfMissing(input.projectId);

    // Trim content if too long
    let content = input.content;
    if (content.length > memoryConfig.maxMessageLength) {
      content = content.substring(0, memoryConfig.maxMessageLength) + "... [Trimmed]";
    }

    memory.recentMessages.push({
      id: `msg_${crypto.randomBytes(4).toString('hex')}`,
      role: input.role,
      content,
      mode: input.mode,
      taskType: input.taskType,
      createdAt: new Date().toISOString()
    });

    // Limit messages
    if (memory.recentMessages.length > memoryConfig.maxRecentMessages) {
      memory.recentMessages = memory.recentMessages.slice(-memoryConfig.maxRecentMessages);
    }

    MemoryStorageService.saveProjectMemory(memory);
    return memory;
  }

  /**
   * Clears recent messages for a project.
   */
  static clearRecentMessages(projectId: string): AillameProjectMemory {
    const memory = this.initializeProjectMemoryIfMissing(projectId);
    memory.recentMessages = [];
    MemoryStorageService.saveProjectMemory(memory);
    return memory;
  }
}
