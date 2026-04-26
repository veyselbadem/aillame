import { useEffect, useState } from 'react';
import { LocalMemoryStore } from '@providers/memory/local';
import type { Message } from '@apptypes/message';

const memory = new LocalMemoryStore();

export function useMemory(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<
    Array<{ id: string; firstMessage: Message | null }>
  >([]);

  useEffect(() => {
    if (conversationId) {
      setLoading(true);
      memory.getMessages(conversationId).then((msgs) => {
        setMessages(msgs);
        setLoading(false);
      });
    }
  }, [conversationId]);

  const refreshConversations = () => {
    memory.listConversations().then(setConversations);
  };

  useEffect(() => {
    refreshConversations();
  }, []);

  return {
    messages,
    loading,
    conversations,
    refreshConversations,
    addMessage: (msg: Message) =>
      conversationId ? memory.addMessage(conversationId, msg).then(() => {
        setMessages((prev) => [...prev, msg]);
      }) : Promise.resolve(),
  };
}
