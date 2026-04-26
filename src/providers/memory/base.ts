import type { Message } from '@apptypes/message';

export interface MemoryStore {
  /**
   * Yeni bir konuşma başlatır ve id döner.
   */
  startConversation(): Promise<string>;

  /**
   * Bir konuşmaya mesaj ekler.
   */
  addMessage(conversationId: string, message: Message): Promise<void>;

  /**
   * Konuşmadaki tüm mesajları getirir.
   */
  getMessages(conversationId: string): Promise<Message[]>;

  /**
   * Tüm konuşmaları (id ve ilk mesaj) listeler.
   */
  listConversations(): Promise<Array<{ id: string; firstMessage: Message | null }>>;
}
