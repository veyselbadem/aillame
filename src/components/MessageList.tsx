'use client';

import { Message } from '@apptypes/message';
import MessageItem from './MessageItem';
import { RefObject, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  conversationId: string;
  topNotice?: ReactNode;
}

export default function MessageList({
  messages,
  loading,
  listRef,
  conversationId,
  topNotice,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-5 py-8 pb-40 sm:px-6">
        {topNotice}

        {messages.map((msg, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
          const promptText =
            msg.role === 'assistant' && previousMessage?.role === 'user'
              ? previousMessage.content
              : undefined;

          return (
            <MessageItem
              key={msg.id}
              message={msg}
              index={index}
              conversationId={conversationId}
              promptText={promptText}
            />
          );
        })}

        {loading && (() => {
          const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
          const activePrompt = lastUserMessage?.content || '';
          const hasAttachment = Boolean(lastUserMessage?.attachments && lastUserMessage.attachments.length > 0);

          const p = activePrompt.toLowerCase().trim();
          const hasAction = /üret|oluştur|çiz|tasarla|yap/i.test(p);
          const hasObject = /görsel|resim|logo|foto|manzara|portre|desen/i.test(p);
          const isImageGen = (hasAction && hasObject) || 
            /görsel oluştur|resim üret|logo tasarla|metinden görsel yap|görsel üret|görsel yap|resim çiz|fotoğraf oluştur/i.test(p);

          const healthSignals = [
            'vision health', 'sağlık kontrol', 'görsel model sağlığı', 'mini görsel testi',
            'sdxl dry-run', 'sağlığını kontrol et', 'health kontrol', 'sağlık durumu',
            'test çalıştır', 'sağlık testi', 'model health'
          ];
          const isHealthCheck = healthSignals.some(sig => p.includes(sig));

          const isMeaningless = p.length === 0 || 
            (p.length < 3 && !/^(hi|ok|no|ye|ha|ok|slm|iyi|ev|hay)$/i.test(p)) ||
            /^[.,\/#!$%\^&\*;:{}=\-_`~()?\s]+$/.test(p) ||
            /^(asdf|qwer|xyz|foo|bar|test)$/i.test(p);

          const isMemorySearch = /hafıza|hafızamda/i.test(p) && (/ara|bul|sorgula|sorgu/i.test(p) || p.includes('ne var') || p.includes('ile ilgili') || p.includes('hakkında'));
          const isMemoryList = /hafıza|hafızamda/i.test(p) && (/listele|göster|hepsi|tümü|neler var/i.test(p));
          const isSystemHealth = /sistem sağlığı|sistem sagligi|sistem sağlığını/i.test(p) || p.includes('sistem durumunu kontrol et') || p.includes('sistem durumu nedir') || p.includes('sistem durumunu sorgula');
          const isModelsStatus = /model durum/i.test(p) || /model durumları/i.test(p) || p.includes('aktif model') || p.includes('yerel model durumunu') || p.includes('yerel modelleri listele');
          const isProjectDocs = /yerel ai mimari|mimari doküman|hafıza sistemi belgesi/i.test(p) || p.includes('mimari döküman') || p.includes('mimari belgeler') || p.includes('mimari dokümanlar');

          let loadingStatus = 'Aillame Nano yanıt hazırlıyor';
          let borderStyle = 'border-indigo-500/10 bg-indigo-500/5';
          let textStyle = 'text-indigo-300/80';
          let dotStyle = 'bg-indigo-400';

          if (hasAttachment) {
            loadingStatus = 'Qwen3-VL 4B görseli analiz ediyor';
            borderStyle = 'border-fuchsia-500/20 bg-fuchsia-500/10';
            textStyle = 'text-fuchsia-300';
            dotStyle = 'bg-fuchsia-400';
          } else if (isMemorySearch) {
            loadingStatus = 'Aillame Nano hafızada arama yapıyor';
            borderStyle = 'border-emerald-500/20 bg-emerald-500/10';
            textStyle = 'text-emerald-300';
            dotStyle = 'bg-emerald-400';
          } else if (isMemoryList) {
            loadingStatus = 'Aillame Nano yerel hafızayı listeliyor';
            borderStyle = 'border-emerald-500/20 bg-emerald-500/10';
            textStyle = 'text-emerald-300';
            dotStyle = 'bg-emerald-400';
          } else if (isSystemHealth) {
            loadingStatus = 'Aillame Nano sistem sağlığını kontrol ediyor';
            borderStyle = 'border-emerald-500/20 bg-emerald-500/10';
            textStyle = 'text-emerald-300';
            dotStyle = 'bg-emerald-400';
          } else if (isModelsStatus) {
            loadingStatus = 'Aillame Nano model durumlarını kontrol ediyor';
            borderStyle = 'border-emerald-500/20 bg-emerald-500/10';
            textStyle = 'text-emerald-300';
            dotStyle = 'bg-emerald-400';
          } else if (isProjectDocs) {
            loadingStatus = 'Aillame Nano proje dokümanlarını kontrol ediyor';
            borderStyle = 'border-emerald-500/20 bg-emerald-500/10';
            textStyle = 'text-emerald-300';
            dotStyle = 'bg-emerald-400';
          } else if (isHealthCheck) {
            loadingStatus = 'Nano Lab sağlık kontrolü hazırlanıyor';
            borderStyle = 'border-emerald-500/20 bg-emerald-500/10';
            textStyle = 'text-emerald-300';
            dotStyle = 'bg-emerald-400';
          } else if (isImageGen) {
            loadingStatus = 'SDXL Turbo görsel üretimi hazırlanıyor';
            borderStyle = 'border-cyan-500/20 bg-cyan-500/10';
            textStyle = 'text-cyan-300';
            dotStyle = 'bg-cyan-400';
          } else if (isMeaningless) {
            loadingStatus = 'Aillame Nano isteği netleştiriyor';
            borderStyle = 'border-indigo-500/20 bg-indigo-500/10';
            textStyle = 'text-indigo-300';
            dotStyle = 'bg-indigo-400';
          }

          return (
            <div className="flex justify-start py-1">
              <div className={`flex items-center gap-3 rounded-2xl rounded-tl-sm border px-4 py-2.5 glass-card shadow-lg transition-all duration-300 ${borderStyle}`}>
                <div className="flex items-center gap-0.5">
                  <div className={`h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s] ${dotStyle}`} />
                  <div className={`h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s] ${dotStyle}`} />
                  <div className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotStyle}`} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${textStyle}`}>
                  {loadingStatus}
                </span>
              </div>
            </div>
          );
        })()}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
