'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { LocalMemoryStore } from '@providers/memory/local';

interface ChatContextType {
  conversationId: string | undefined;
  setConversationId: (id: string | undefined) => void;
  startNewChat: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const memory = new LocalMemoryStore();

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversationId, setConversationId] = useState<string | undefined>(() => Date.now().toString());

  useEffect(() => {
    let cancelled = false;

    memory.getAllConversations()
      .then((ids) => {
        if (cancelled) return;
        if (ids.length > 0) {
          setConversationId(ids[ids.length - 1]);
          return;
        }
        startNewChat();
      })
      .catch(() => {
        if (!cancelled) {
          startNewChat();
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const startNewChat = async () => {
    const newId = await memory.startConversation();
    setConversationId(newId);
  };

  return (
    <ChatContext.Provider value={{ conversationId, setConversationId, startNewChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatState() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatState must be used within a ChatProvider');
  }
  return context;
}
