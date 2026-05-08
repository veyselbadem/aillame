'use client';

import { useRef, useEffect } from 'react';
import { Message } from '@apptypes/message';
import FeedbackActions from './FeedbackActions';
import { FiAlertTriangle } from 'react-icons/fi';

interface MessageItemProps {
  message: Message;
  index?: number;
  conversationId?: string;
  promptText?: string;
}

// Fallback veya hata mesajlarını tespit et
function isFallbackMessage(content: string): boolean {
  return (
    content.includes('Aillame Nano mesajını aldı') ||
    content.includes('Cevap alınamadı') ||
    content.includes('Yerel model şu an') ||
    content.includes('bir hata oluştu') ||
    content.includes('hazır değil')
  );
}

export default function MessageItem({ message, index = 0, conversationId, promptText }: MessageItemProps) {
  const isUser = message.role === 'user';
  const ref = useRef<HTMLDivElement>(null);
  const isFallback = !isUser && isFallbackMessage(message.content);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.animationDelay = `${Math.min(index * 40, 300)}ms`;
    }
  }, [index]);

  return (
    <div
      ref={ref}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4 animate-slide-in`}
      style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
    >
      {/* Avatar — Assistant */}
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-auto">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white text-[9px] font-black">A</span>
          </div>
        </div>
      )}

      <div className="relative max-w-[82%] sm:max-w-[68%] group">
        {/* Ambient glow (assistant) */}
        {!isUser && (
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/0 via-indigo-500/6 to-purple-500/0 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />
        )}

        {/* Fallback / Error banner */}
        {isFallback ? (
          <div 
            className="relative rounded-3xl rounded-tl-sm border px-5 py-4 text-sm shadow-2xl backdrop-blur-sm transition-all duration-300"
            style={{ 
              backgroundColor: 'var(--status-warning-bg)', 
              borderColor: 'var(--glass-border)',
              color: 'var(--status-warning-text)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <FiAlertTriangle size={10} className="text-amber-500 flex-shrink-0" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70">System · Fallback</span>
            </div>
            <div className="whitespace-pre-wrap break-words leading-relaxed font-semibold">
              {message.content}
            </div>
            {conversationId && <FeedbackActions message={message} conversationId={conversationId} promptText={promptText} />}
          </div>
        ) : (
          <div
            className={`relative px-5 py-4 rounded-3xl text-sm leading-relaxed shadow-2xl transition-all duration-300 border ${
              isUser
                ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white border-white/10 rounded-tr-sm shadow-indigo-500/20'
                : 'glass-card dark:text-gray-100 text-gray-800 border-white/5 dark:border-white/5 border-indigo-100/50 rounded-tl-sm'
            }`}
          >
            {/* Role/Model badge */}
            {!isUser && (
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80">Aillame Nano</span>
                <div className="h-2 w-2 rounded-full bg-emerald-500/50 animate-pulse" />
              </div>
            )}
            
            {isUser && (
              <span className="block text-[10px] font-black uppercase tracking-[0.3em] mb-2.5 text-indigo-200/50">
                Sen
              </span>
            )}

            {/* Content */}
            <div className={`whitespace-pre-wrap break-words ${isUser ? 'font-medium' : 'font-normal'}`}>
              {message.content ? (
                message.content
              ) : (
                /* Typing animation */
                <div className="flex gap-2 items-center py-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}
            </div>

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {message.attachments.map((attachment) => (
                  <img
                    key={attachment.id}
                    src={attachment.dataUrl}
                    alt={attachment.name}
                    className="max-h-64 w-full rounded-2xl object-cover border border-white/10 shadow-lg"
                  />
                ))}
              </div>
            )}

            {conversationId && (
              <FeedbackActions message={message} conversationId={conversationId} promptText={promptText} />
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-1 text-[9px] text-gray-700 font-mono ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Avatar — User */}
      {isUser && (
        <div className="flex-shrink-0 ml-3 mt-auto">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
            <span className="text-white text-[9px] font-black">S</span>
          </div>
        </div>
      )}
    </div>
  );
}
