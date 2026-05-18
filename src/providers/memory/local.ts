import { openDB, DBSchema } from 'idb';
import type { MemoryStore } from './base';
import type { Message } from '@apptypes/message';

interface MemoryDB extends DBSchema {
  conversations: {
    key: string;
    value: { id: string; createdAt: number };
  };
  messages: {
    key: string;
    value: Message & { conversationId: string };
    indexes: { 'by-conversation': string };
  };
}

export class LocalMemoryStore implements MemoryStore {
  private dbPromise: any = null;
  private fallbackConversations = new Map<string, { id: string; createdAt: number }>();
  private fallbackMessages = new Map<string, Array<Message & { conversationId: string }>>();

  private canUseIndexedDb() {
    return typeof indexedDB !== 'undefined';
  }

  private async getDb() {
    if (!this.canUseIndexedDb()) {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB<MemoryDB>('aillame-memory', 1, {
        upgrade(db) {
          db.createObjectStore('conversations', { keyPath: 'id' });
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('by-conversation', 'conversationId');
        },
      });
    }
    return await this.dbPromise;
  }

  async startConversation(): Promise<string> {
    const id = Date.now().toString();
    const db = await this.getDb();
    if (!db) {
      this.fallbackConversations.set(id, { id, createdAt: Date.now() });
      this.fallbackMessages.set(id, []);
      return id;
    }

    await db.add('conversations', { id, createdAt: Date.now() });
    return id;
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      const current = this.fallbackMessages.get(conversationId) ?? [];
      this.fallbackMessages.set(conversationId, [...current, { ...message, conversationId }]);
      return;
    }

    await db.add('messages', { ...message, conversationId });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const db = await this.getDb();
    if (!db) {
      return (this.fallbackMessages.get(conversationId) ?? []).map(({ conversationId: _id, ...message }) => message);
    }

    return db.getAllFromIndex('messages', 'by-conversation', conversationId);
  }

  async listConversations(): Promise<Array<{ id: string; firstMessage: Message | null }>> {
    const db = await this.getDb();
    if (!db) {
      return Array.from(this.fallbackConversations.values())
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map((conv) => ({
          id: conv.id,
          firstMessage: this.fallbackMessages.get(conv.id)?.[0] ?? null,
        }));
    }

    const convs = await db.getAll('conversations');
    const result = await Promise.all(
      convs.map(async (conv: { id: string; createdAt: number }) => {
        const msgs = await db.getAllFromIndex('messages', 'by-conversation', conv.id);
        return { id: conv.id, firstMessage: msgs[0] || null };
      })
    );
    return result.sort((a, b) => Number(b.id) - Number(a.id));
  }

  // Sidebar uyumluluğu için alias
  async getAllConversations(): Promise<string[]> {
    const db = await this.getDb();
    if (!db) {
      return Array.from(this.fallbackConversations.keys()).sort((a, b) => Number(b) - Number(a));
    }

    const convs = await db.getAll('conversations');
    return convs.map((c: { id: string; createdAt: number }) => c.id);
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.fallbackConversations.delete(id);
      this.fallbackMessages.delete(id);
      return;
    }

    const tx = db.transaction(['conversations', 'messages'], 'readwrite');
    await tx.objectStore('conversations').delete(id);
    const msgStore = tx.objectStore('messages');
    const index = msgStore.index('by-conversation');
    const keys = await index.getAllKeys(id);
    for (const key of keys) {
      await msgStore.delete(key);
    }
    await tx.done;
  }

  async clearConversationMessages(conversationId: string): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.fallbackMessages.set(conversationId, []);
      return;
    }

    const tx = db.transaction('messages', 'readwrite');
    const msgStore = tx.objectStore('messages');
    const index = msgStore.index('by-conversation');
    const keys = await index.getAllKeys(conversationId);
    for (const key of keys) {
      await msgStore.delete(key);
    }
    await tx.done;
  }
}
