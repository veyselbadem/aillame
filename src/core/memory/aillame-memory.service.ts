import { readFile, writeFile, rename } from 'fs/promises';
import path from 'path';
import { resolveProjectRelative } from '../project-root';

export type AillameMemoryType = 'preference' | 'project' | 'system' | 'workflow' | 'note';

export type AillameMemory = {
  id: string;
  type: AillameMemoryType;
  scope: 'user' | 'project' | 'session';
  content: string;
  tags: string[];
  source: 'user_approved' | 'system_generated' | 'imported';
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  confidence?: number;
  sensitive: boolean;
};

export type AillameSessionContext = {
  lastPrompt: string;
  lastIntent: string;
  lastTarget: string;
  lastModelId: string;
  lastRouteExplanation: string;
  timestamp: number;
};

const MEMORY_STORE_PATH = resolveProjectRelative('.aillame-data/stores/aillame-memory.json');

// Memory in-memory session store
let sessionContext: AillameSessionContext | null = null;

// Sensitive terms scanner for safety guardrail
const SENSITIVE_PATTERNS = [
  /password|şifre|parola|passphrase/i,
  /secret|token|api\s*key|apikey|api_key|private\s*key|private_key/i,
  /ssh-rsa|begin\s+(cryptographic|private)\s+key|pgp\s+private/i,
  /credit|card|kart|cvv|expiry|finans|iban|banka|hesap\s*no/i,
  /tc\s*kimlik|identity|ssn|pasaport/i,
  /bearer|auth|credentials/i
];

export function isSensitiveContent(text: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}

// Atomic file readers & writers with self-healing recovery strategy
async function readMemoryFile(): Promise<AillameMemory[]> {
  try {
    const raw = await readFile(MEMORY_STORE_PATH, 'utf-8');
    const normalizedRaw = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalizedRaw) as AillameMemory[];
  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    
    // Self-healing recovery: If file is corrupted, backup it and reinitialize empty database
    console.error('[AillameMemory] Failed to parse memory JSON (corrupted). Healing database...', error);
    try {
      const fs = require('fs');
      if (fs.existsSync(MEMORY_STORE_PATH)) {
        const backupPath = `${MEMORY_STORE_PATH}.corrupted-${Date.now()}`;
        fs.renameSync(MEMORY_STORE_PATH, backupPath);
        console.warn(`[AillameMemory] Corrupted memory file backed up to: ${backupPath}`);
      }
      // Initialize with empty array
      await writeMemoryFile([]);
    } catch (recoveryError) {
      console.error('[AillameMemory] Critical: Healing recovery failed:', recoveryError);
    }
    return [];
  }
}

async function writeMemoryFile(records: AillameMemory[]): Promise<void> {
  try {
    const dir = path.dirname(MEMORY_STORE_PATH);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const tempPath = `${MEMORY_STORE_PATH}.tmp`;
    const data = JSON.stringify(records, null, 2);
    
    // Atomic Write: Write to tmp first, then rename atomically
    await writeFile(tempPath, data, 'utf-8');
    await rename(tempPath, MEMORY_STORE_PATH);
  } catch (error) {
    console.error('[AillameMemory] Failed to write memory JSON:', error);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const AillameMemoryService = {
  // 1. Session context management
  getSessionContext(): AillameSessionContext | null {
    return sessionContext;
  },

  updateSessionContext(context: Omit<AillameSessionContext, 'timestamp'>): AillameSessionContext {
    sessionContext = {
      ...context,
      timestamp: Date.now()
    };
    return sessionContext;
  },

  clearSessionContext(): void {
    sessionContext = null;
  },

  // 2. Memory persistence management
  async listMemories(): Promise<AillameMemory[]> {
    return readMemoryFile();
  },

  async createMemory(input: {
    type: AillameMemoryType;
    scope: 'user' | 'project' | 'session';
    content: string;
    tags: string[];
    source?: AillameMemory['source'];
  }): Promise<AillameMemory> {
    // 1. Check for sensitive info
    const sensitive = isSensitiveContent(input.content) || input.tags.some(isSensitiveContent);
    if (sensitive) {
      throw new Error('Hassas veya gizli bilgi içeren veriler güvenlik nedeniyle yerel hafızaya kaydedilemez.');
    }

    const memories = await readMemoryFile();
    const now = new Date().toISOString();

    const newMemory: AillameMemory = {
      id: generateId(),
      type: input.type,
      scope: input.scope,
      content: input.content.trim(),
      tags: input.tags.map(t => t.toLowerCase().trim()),
      source: input.source || 'user_approved',
      createdAt: now,
      updatedAt: now,
      sensitive: false
    };

    memories.push(newMemory);
    await writeMemoryFile(memories);
    return newMemory;
  },

  async deleteMemory(id: string): Promise<boolean> {
    const memories = await readMemoryFile();
    const initialLength = memories.length;
    const filtered = memories.filter(m => m.id !== id);
    
    if (filtered.length < initialLength) {
      await writeMemoryFile(filtered);
      return true;
    }
    return false;
  },

  async searchMemories(query: string): Promise<AillameMemory[]> {
    const memories = await readMemoryFile();
    const q = query.toLowerCase().trim();
    if (!q) return memories;

    return memories.filter(m => 
      m.content.toLowerCase().includes(q) || 
      m.tags.some(t => t.includes(q)) ||
      m.type.toLowerCase().includes(q)
    );
  },

  // 3. Relevant context retrieval for chat prompt injection
  async getRelevantMemoriesForPrompt(prompt: string, limit: number = 3): Promise<AillameMemory[]> {
    const memories = await readMemoryFile();
    const p = prompt.toLowerCase().trim();
    if (!p) return [];

    // Simple keyword relevance ranking
    const scored = memories.map(m => {
      let score = 0;
      // Match type
      if (m.type === 'preference' && /tercih|stil|öznitelik|ayarla/i.test(p)) score += 2;
      if (m.type === 'project' && /proje|kod|yazılım|geliştir/i.test(p)) score += 2;
      
      // Match content keywords
      const words = p.split(/\s+/);
      for (const word of words) {
        if (word.length > 2) {
          if (m.content.toLowerCase().includes(word)) score += 3;
          if (m.tags.some(t => t.includes(word))) score += 4;
        }
      }
      return { memory: m, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => {
        // Record last used timestamp
        item.memory.lastUsedAt = new Date().toISOString();
        return item.memory;
      });
  },

  // Stub for UI suggestions (not auto-approved)
  suggestMemoryFromInteraction(prompt: string, response: string): { type: AillameMemoryType; content: string; tags: string[] } | null {
    const p = prompt.toLowerCase().trim();
    
    // Check if user states a preference or rule
    if (/bundan sonra|her zaman|artık|şunu yapma|öğreniyorum|kullanıyorum/i.test(p)) {
      if (isSensitiveContent(prompt)) return null;

      return {
        type: 'preference',
        content: `Kullanıcı Tercihi: ${prompt}`,
        tags: ['user-preference', 'workflow']
      };
    }
    return null;
  }
};
