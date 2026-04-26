'use client';

import { Message } from '@apptypes/message';
import MessageItem from './MessageItem';
import { RefObject, useEffect, useRef } from 'react';
import { FiTerminal } from 'react-icons/fi';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  conversationId: string;
}

export default function MessageList({ messages, loading, listRef, conversationId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar scroll-smooth"
    >
      {/* Empty state */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-5 opacity-30 select-none pt-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
            <FiTerminal size={26} className="text-indigo-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Aillame Workspace</p>
            <p className="text-xs text-gray-600 max-w-[220px] leading-relaxed">
              Bir görev veya soru yaz, Nano motoru yanıt verecek.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageItem key={msg.id} message={msg} index={i} conversationId={conversationId} />
      ))}

      {/* Loading / Typing indicator */}
      {loading && (
        <div className="flex justify-start px-4 py-1">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl rounded-tl-sm glass-card border border-white/5">
            {/* Animated terminal cursor */}
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-300/60">
              Aillame Nano işliyor
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
