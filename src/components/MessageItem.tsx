'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@apptypes/message';
import FeedbackActions from './FeedbackActions';
import { FiAlertTriangle, FiCopy, FiCheck } from 'react-icons/fi';
import ChatImageGenerationCard from './chat/ChatImageGenerationCard';

interface MessageItemProps {
  message: Message;
  index?: number;
  conversationId?: string;
  promptText?: string;
}

function isFallbackMessage(content: string): boolean {
  const normalized = content.toLocaleLowerCase('tr-TR');

  return (
    normalized.includes('aillame nano mesajını aldı') ||
    normalized.includes('aillame nano mesaj') ||
    normalized.includes('cevap alınamadı') ||
    normalized.includes('cevap alinamadi') ||
    normalized.includes('yerel model şu an') ||
    normalized.includes('bir hata oluştu') ||
    normalized.includes('bir hata olustu') ||
    normalized.includes('hazır değil') ||
    normalized.includes('hazir degil') ||
    normalized.includes('desteklenmiyor') ||
    normalized.includes('devre dışı') ||
    normalized.includes('devre disi') ||
    normalized.includes('degraded')
  );
}

export default function MessageItem({
  message,
  index = 0,
  conversationId,
  promptText,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const ref = useRef<HTMLDivElement>(null);
  const isFallback = !isUser && isFallbackMessage(message.content);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.animationDelay = `${Math.min(index * 40, 300)}ms`;
    }
  }, [index]);

  const handleCopy = () => {
    if (!message.content) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      ref={ref}
      className={`flex w-full items-start ${isUser ? 'justify-end' : 'justify-start'} animate-slide-in`}
      style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
    >
      {!isUser && (
        <div className="mr-3 mt-2 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20">
            <span className="text-[9px] font-black text-white">A</span>
          </div>
        </div>
      )}

      <div
        className={`group relative min-w-0 ${
          isUser ? 'max-w-[85%] md:max-w-[70%]' : 'max-w-[88%] md:max-w-[75%]'
        }`}
      >
        {!isUser && (
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/6 to-purple-500/0 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100" />
        )}

        {isFallback ? (
          <div className="relative rounded-2xl rounded-tl-sm border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100 shadow-2xl backdrop-blur-sm transition-all duration-300">
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 rounded-xl border border-amber-500/10 bg-amber-500/5 p-2 text-amber-300 opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-amber-500/10 group-hover:opacity-100"
              title="Kopyala"
              aria-label={copied ? 'Mesaj kopyalandı' : 'Mesajı kopyala'}
            >
              {copied ? <FiCheck size={14} className="text-emerald-500" /> : <FiCopy size={14} />}
            </button>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500/20">
                <FiAlertTriangle size={10} className="flex-shrink-0 text-amber-300" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-100/70">
                Sistem · Fallback
              </span>
            </div>
            <div className="whitespace-pre-wrap break-words pr-8 font-semibold leading-relaxed">
              {message.content}
            </div>
            {conversationId && (
              <FeedbackActions message={message} conversationId={conversationId} promptText={promptText} />
            )}
          </div>
        ) : (
          <div
            className={`relative rounded-2xl border px-5 py-4 text-sm leading-relaxed shadow-2xl transition-all duration-300 ${
              isUser
                ? 'rounded-tr-sm border-white/10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-indigo-500/20'
                : 'rounded-tl-sm border-white/10 bg-slate-900/60 text-gray-100 backdrop-blur-xl'
            }`}
          >
            {!isUser && (
              <div className="mb-3 flex flex-col gap-1.5 border-b border-white/5 pb-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                      message.metadata?.model?.provider === 'qwen'
                        ? 'text-fuchsia-400'
                        : message.metadata?.model?.provider === 'sdxl'
                          ? 'text-cyan-400'
                          : message.metadata?.model?.provider === 'ollama'
                            ? 'text-purple-400'
                            : message.metadata?.model?.name?.includes('Teşhis') || message.metadata?.model?.name?.includes('Lab')
                              ? 'text-emerald-400'
                              : 'text-indigo-400'
                    }`}>
                      {message.metadata?.model?.name || 'Aillame Nano'}
                    </span>
                    <span className={`rounded px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-widest ${
                      message.metadata?.model?.provider === 'qwen'
                        ? 'border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300'
                        : message.metadata?.model?.provider === 'sdxl'
                          ? 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
                          : message.metadata?.model?.provider === 'ollama'
                            ? 'border border-purple-500/20 bg-purple-500/10 text-purple-300'
                            : message.metadata?.model?.name?.includes('Teşhis')
                              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
                    }`}>
                      {message.metadata?.model?.provider === 'qwen'
                        ? 'Vision'
                        : message.metadata?.model?.provider === 'sdxl'
                          ? 'SDXL'
                          : message.metadata?.model?.provider === 'ollama'
                            ? 'Ollama'
                            : message.metadata?.model?.name?.includes('Teşhis')
                              ? 'Teşhis'
                              : 'Nano'}
                    </span>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                  </div>
                  {message.metadata?.latencyMs && (
                    <span className="text-[9px] font-mono text-indigo-300/40">
                      {message.metadata.latencyMs}ms
                    </span>
                  )}
                </div>

                {message.metadata?.model && (
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold">
                    <span className="uppercase tracking-tighter text-indigo-300/60">Model:</span>
                    <span className="text-indigo-400/80">{message.metadata.model.name}</span>
                    <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[8px] text-indigo-300/70">
                      {message.metadata.model.runtime}
                    </span>
                  </div>
                )}

                {message.metadata?.toolExecuted && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] font-bold">
                    <span className="uppercase tracking-tighter text-indigo-300/60">Araç:</span>
                    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                      message.metadata.toolOk === false
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    }`}>
                      {message.metadata.toolExecuted === 'memory.search' && 'Hafıza Araması'}
                      {message.metadata.toolExecuted === 'memory.list' && 'Hafıza Listesi'}
                      {message.metadata.toolExecuted === 'system.health' && 'Sistem Sağlığı'}
                      {message.metadata.toolExecuted === 'models.status' && 'Model Durumu'}
                      {message.metadata.toolExecuted === 'project.docs' && 'Proje Dokümanları'}
                      {!['memory.search', 'memory.list', 'system.health', 'models.status', 'project.docs'].includes(message.metadata.toolExecuted) && message.metadata.toolExecuted}
                    </span>
                    {message.metadata.toolRiskLevel && (
                      <span className="rounded border border-white/5 bg-white/5 px-1 py-0.2 text-[8px] font-extrabold text-indigo-300/50">
                        {message.metadata.toolRiskLevel}
                      </span>
                    )}
                  </div>
                )}

                {message.metadata?.degraded && (
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5">
                    <FiAlertTriangle className="text-rose-400" size={10} />
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">
                      {message.metadata.errorCode === 'DEV_MODE_NATIVE_DISABLED'
                        ? 'DEV MODE: NATIVE DISABLED'
                        : message.metadata.errorCode === 'UNSUPPORTED_ARCHITECTURE'
                          ? 'UNSUPPORTED MODEL'
                          : message.metadata.errorCode === 'LOCAL_INFERENCE_TIMEOUT'
                            ? 'TIMEOUT'
                            : 'DEGRADED PERFORMANCE'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {isUser && (
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200/50">
                  Sen
                </span>
                {message.metadata?.uiContextMetadata?.hasManualWorkspaceContext && (
                  <span className="whitespace-nowrap rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[9px] font-semibold text-indigo-300/80">
                    {message.metadata.uiContextMetadata.manualContextItemCount || 0} snippet
                  </span>
                )}
              </div>
            )}

            <button
              onClick={handleCopy}
              className={`absolute right-3 top-3 rounded-xl border p-2 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 ${
                isUser
                  ? 'border-white/10 bg-white/10 text-indigo-100 hover:bg-white/20'
                  : 'border-indigo-500/10 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/10'
              }`}
              title="Kopyala"
              aria-label={copied ? 'Mesaj kopyalandı' : 'Mesajı kopyala'}
            >
              {copied ? <FiCheck size={14} className="text-emerald-500" /> : <FiCopy size={14} />}
            </button>

            <div className={`whitespace-pre-wrap break-words pr-8 ${isUser ? 'font-medium' : 'font-normal'}`}>
              {message.content ? (
                message.content
              ) : (
                <div className="flex items-center gap-2 py-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}
            </div>

            {message.imageJobId && (
              <ChatImageGenerationCard
                jobId={message.imageJobId}
                prompt={message.imagePrompt ?? ''}
                englishPrompt={message.imageEnglishPrompt ?? ''}
              />
            )}

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {message.attachments.map((attachment) => (
                  <img
                    key={attachment.id}
                    src={attachment.dataUrl}
                    alt={attachment.name}
                    className="max-h-64 w-full rounded-2xl border border-white/10 object-cover shadow-lg"
                  />
                ))}
              </div>
            )}

            {conversationId && (
              <FeedbackActions message={message} conversationId={conversationId} promptText={promptText} />
            )}
          </div>
        )}

        <div className={`mt-1.5 font-mono text-[9px] text-slate-500 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {isUser && (
        <div className="ml-3 mt-2 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 shadow-lg">
            <span className="text-[9px] font-black text-white">S</span>
          </div>
        </div>
      )}
    </div>
  );
}
