'use client';

import { useEffect, useState } from 'react';
import { useChat } from '@hooks/useChat';
import { useDragDrop } from '@hooks/useDragDrop';
import type { ActiveTool } from '@hooks/useChat';
import { getChatModelForTier, modelSupports } from '@core/models/registry';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import {
  FiZap,
  FiSearch,
  FiDatabase,
  FiCheckCircle,
  FiLoader,
  FiAlertCircle,
  FiUploadCloud,
  FiTrash2,
  FiSquare,
  FiCpu,
  FiShield,
  FiChevronDown,
  FiChevronUp,
  FiPlayCircle,
} from 'react-icons/fi';
import { LocalRuntimeStatus } from './chat/LocalRuntimeStatus';
import { LocalRuntimePanel } from './chat/LocalRuntimePanel';
import { NanoProfileSelector } from './chat/NanoProfileSelector';
import { useRuntimeStatus } from '@hooks/useRuntimeStatus';
import { useSettings } from '@hooks/useSettings';
import {
  MANUAL_CONTEXT_ATTACH_EVENT,
  ManualContextAttachEventDetail,
} from '@lib/manual-context-attach-events';

interface ChatShellProps {
  conversationId: string;
}

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  web_search:    { label: 'Web Araması', icon: <FiSearch size={10} />, color: 'running' },
  memory_search: { label: 'Hafıza', icon: <FiDatabase size={10} />, color: 'running' },
  calculate:     { label: 'Hesaplama', icon: <FiZap size={10} />, color: 'running' },
  code_execute:  { label: 'Kod Önizleme', icon: <FiZap size={10} />, color: 'running' },
  learn_content: { label: 'Öğreniliyor', icon: <FiDatabase size={10} />, color: 'running' },
};

function ToolCallBar({ tools }: { tools: ActiveTool[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="px-5 py-2 border-b border-white/5 bg-indigo-500/[0.04] flex items-center gap-2 flex-wrap animate-slide-in">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Araçlar</span>
      {tools.map((t, i) => {
        const meta = TOOL_META[t.call.tool] || { label: t.call.tool, icon: <FiZap size={10} />, color: 'running' };
        return (
          <span key={i} className={`tool-badge ${t.status}`}>
            {t.status === 'running'
              ? <FiLoader size={9} className="tool-pulse" />
              : t.status === 'done'
              ? <FiCheckCircle size={9} />
              : <FiAlertCircle size={9} />
            }
            {meta.icon}
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function ProjectContextSurface() {
  return (
    <div className="border-b px-5 py-2 theme-divider theme-soft-panel flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-widest theme-title">Workspace</span>
        </div>
        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-3">
          <NanoProfileSelector />
          <LocalRuntimeStatus />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500/80">
          Native Runtime
        </span>
      </div>
    </div>
  );
}

export default function ChatShell({ conversationId }: ChatShellProps) {
  // Nano-only: sabit, değiştirilemez.
  const llmMode: 'local' = 'local';
  const tier: 'nano' = 'nano';
  const chatModel = getChatModelForTier(tier);
  const visionEnabled = modelSupports(chatModel.id, 'vision-image-understanding');
  const { session } = useRuntimeStatus();

  const {
    messages,
    setMessages,
    input,
    setInput,
    attachments,
    setAttachments,
    sendMessage,
    stopGeneration,
    clearMessages,
    loading,
    activeTools,
    listRef,
  } = useChat(conversationId, { llmMode, tier });

  useEffect(() => {
    const onManualContextAttach = (event: Event) => {
      const customEvent = event as CustomEvent<ManualContextAttachEventDetail>;
      const attachedText = customEvent.detail?.text?.trim();
      if (!attachedText) {
        return;
      }

      setInput((prev) => {
        if (!prev.trim()) {
          return attachedText;
        }
        return `${prev}\n\n${attachedText}`;
      });
    };

    window.addEventListener(MANUAL_CONTEXT_ATTACH_EVENT, onManualContextAttach);
    return () => {
      window.removeEventListener(MANUAL_CONTEXT_ATTACH_EVENT, onManualContextAttach);
    };
  }, [setInput]);

  const isModelLoaded = session?.processState === 'loaded';

  const { isDragOver, dragHandlers } = useDragDrop({
    onFileProcessed: (file) => {
      if (file.attachment && visionEnabled) {
        setAttachments([...attachments, file.attachment].slice(0, 4));
      }
    },
    onMessage: (text) => {
      const systemMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    },
  });

  return (
    <div
      className="flex flex-col h-full w-full neural-grid rounded-[inherit] overflow-hidden relative"
      {...dragHandlers}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 glass-card flex flex-col items-center justify-center bg-indigo-600/10 backdrop-blur-md animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 flex items-center justify-center mb-4 border border-indigo-500/30">
            <FiUploadCloud size={32} className="text-indigo-400 animate-bounce" />
          </div>
          <p className="text-lg font-black text-white tracking-widest uppercase">Dosyayı Bırak</p>
          <p className="text-xs text-indigo-300/70 font-mono mt-2">TXT · DOCX · PDF · EPUB · PNG · JPG · WEBP</p>
        </div>
      )}

      <div className="relative z-20 flex flex-shrink-0 items-center justify-between gap-4 border-b px-5 py-3 theme-divider bg-[var(--bg-surface)]/70 backdrop-blur-sm">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-xs">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] leading-tight theme-title">Sohbet Asistanı</span>
              <span className="text-[8px] font-bold text-indigo-400/80 uppercase tracking-widest mt-0.5">{chatModel.shortLabel}</span>
            </div>
          </div>
        </div>

        <button
          onClick={clearMessages}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-xl p-2 theme-muted transition-all hover:bg-rose-500/10 hover:text-rose-500 group"
          title="Sohbeti Temizle"
          aria-label="Sohbeti Temizle"
        >
          <FiTrash2 size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            Temizle
          </span>
        </button>
      </div>

      <ProjectContextSurface />
      <ToolCallBar tools={activeTools} />

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <MessageList messages={messages} loading={loading} listRef={listRef} conversationId={conversationId} />
        
        {!isModelLoaded && !loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--bg-surface)]/90 backdrop-blur-md animate-fade-in p-10">
            <div className="max-w-sm w-full">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-[32px] bg-indigo-600/10 flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                  <FiPlayCircle size={40} className="text-indigo-500" />
                </div>
                <h3 className="text-xl font-black theme-title tracking-tight mb-3">Model Hazır Değil</h3>
                <p className="text-sm theme-muted leading-relaxed">
                  Yerel çıkarım yapabilmek için önce runtime'ı başlatmalı ve bir GGUF modeli yüklemelisin.
                </p>
              </div>
              
              <LocalRuntimePanel />

              <div className="mt-8 text-center">
                <a 
                  href="/admin/model-library" 
                  className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500/60 hover:text-indigo-500 transition-colors"
                >
                  Model Kütüphanesine Git →
                </a>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={stopGeneration}
            className="flex items-center gap-2 rounded-full theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:border-rose-500/30 shadow-2xl border border-white/5"
            >
              <FiSquare size={10} className="fill-current text-rose-500" />
              <span>Durdur</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-gradient-to-t from-slate-200/50 to-transparent p-4 dark:from-black/20">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          disabled={loading || !isModelLoaded}
          visionEnabled={visionEnabled}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
      </div>
    </div>
  );
}
