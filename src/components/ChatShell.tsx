'use client';

import { useState } from 'react';
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
} from 'react-icons/fi';

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

function ProjectContextSurface({ modelLabel }: { modelLabel: string }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border-b px-5 py-3 theme-divider theme-soft-panel">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] theme-title">general</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] theme-muted">project</span>
          </div>
          <div className="hidden h-4 w-px bg-slate-300 dark:bg-slate-700 sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] theme-muted">Mode</span>
            <span className="text-[10px] font-semibold theme-secondary">chat</span>
          </div>
          <div className="hidden h-4 w-px bg-slate-300 dark:bg-slate-700 sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] theme-muted">Runtime</span>
            <span className="text-[10px] font-semibold text-amber-300">{modelLabel} · diagnostic</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
            Local only
          </span>
          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full theme-elevated px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] theme-secondary hover:border-indigo-500/35"
          >
            {showDetails ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
            Detaylar
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 grid gap-3 border-t pt-3 theme-divider md:grid-cols-3">
          <div className="theme-surface rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] theme-muted">Memory</p>
            <p className="mt-1 text-[11px] font-medium theme-secondary">project scope · kayıtlı kaynak yok</p>
          </div>
          <div className="theme-surface rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] theme-muted">Nano</p>
            <p className="mt-1 text-[11px] font-medium theme-secondary">advisory/eval · autonomous disabled</p>
          </div>
          <div className="theme-surface rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] theme-muted">Attribution</p>
            <p className="mt-1 text-[11px] font-medium theme-secondary">Bu cevap için kayıtlı hafıza/kaynak kullanılmadı.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatShell({ conversationId }: ChatShellProps) {
  // Nano-only: sabit, değiştirilemez.
  const llmMode: 'local' = 'local';
  const tier: 'nano' = 'nano';
  const chatModel = getChatModelForTier(tier);
  const visionEnabled = modelSupports(chatModel.id, 'vision-image-understanding');

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
              <span className="text-[10px] font-black uppercase tracking-[0.25em] leading-tight theme-title">Aillame Workspace</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                <span className="text-[8px] font-bold text-amber-400/80 uppercase tracking-widest">{chatModel.shortLabel} · diagnostic</span>
              </div>
            </div>
          </div>

          <div className="hidden h-4 w-px bg-slate-300 dark:bg-slate-700 sm:block" />

          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-indigo-700 transition-colors hover:bg-indigo-500/15 dark:text-indigo-300">
              <FiCpu size={9} />
              Nano Advisory
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300">
              <FiShield size={9} />
              Local Only
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

      <ProjectContextSurface modelLabel={chatModel.shortLabel ?? chatModel.id} />
      <ToolCallBar tools={activeTools} />

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <MessageList messages={messages} loading={loading} listRef={listRef} conversationId={conversationId} />
        {loading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={stopGeneration}
            className="flex items-center gap-2 rounded-full theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:border-rose-500/30"
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
          disabled={loading}
          visionEnabled={visionEnabled}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
      </div>
    </div>
  );
}
