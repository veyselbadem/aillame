'use client';

import { useState, useEffect } from 'react';
import ChatShell from '@components/ChatShell';
import ConversationList from '@components/ConversationList';
import { LocalMemoryStore } from '@providers/memory/local';

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | undefined>();

  useEffect(() => {
    if (!conversationId) {
      const memory = new LocalMemoryStore();
      memory.startConversation().then(setConversationId);
    }
  }, [conversationId]);

  return (
    <div className="flex h-full">
      <ConversationList onSelect={setConversationId} selectedId={conversationId} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl h-[70vh]">
          {conversationId && <ChatShell conversationId={conversationId} />}
        </div>
      </div>
    </div>
  );
}
