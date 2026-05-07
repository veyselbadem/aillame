'use client';

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
  FiLayers,
} from 'react-icons/fi';

interface ChatShellProps {
  conversationId: string;
}

interface ProjectContextItem {
  label: string;
  value: string;
  tone: string;
}

const PROJECT_PRESETS = ['general', 'aillame', 'boss-ai', 'doomsgame-engine', 'badem-akademi'] as const;

const DEFAULT_PROJECT_CONTEXT: ProjectContextItem[] = [
  { label: 'Project', value: 'general', tone: 'text-indigo-300 border-indigo-500/20 bg-indigo-500/10' },
  { label: 'Mode', value: 'general', tone: 'text-slate-300 border-slate-500/20 bg-slate-500/10' },
  { label: 'Task', value: 'chat', tone: 'text-cyan-300 border-cyan-500/20 bg-cyan-500/10' },
  { label: 'Memory', value: 'project scope', tone: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' },
  { label: 'Source', value: 'aillame-ui', tone: 'text-slate-300 border-slate-500/20 bg-slate-500/10' },
  { label: 'Runtime', value: 'local text · degraded preview', tone: 'text-amber-300 border-amber-500/20 bg-amber-500/10' },
  { label: 'Nano', value: 'advisory diagnostics', tone: 'text-purple-300 border-purple-500/20 bg-purple-500/10' },
] as const;

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
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/60">Araçlar:</span>
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

function ProjectContextBar({ modelLabel }: { modelLabel: string }) {
  const contextItems = DEFAULT_PROJECT_CONTEXT.map((item) =>
    item.label === 'Runtime'
      ? { ...item, value: `local text · ${modelLabel} · diagnostic preview` }
      : item
  );

  return (
    <div className="border-b border-white/5 bg-slate-950/20 px-5 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FiLayers size={13} className="text-indigo-300" />
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
              Project Context
            </p>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Runtime ve project memory bilgisi bu fazda güvenli diagnostic preview olarak gösterilir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contextItems.map((item) => (
            <span key={item.label} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${item.tone}`}>
              <span className="mr-1 uppercase tracking-[0.16em] opacity-60">{item.label}</span>
              {item.value}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PROJECT_PRESETS.map((projectId) => (
          <span key={projectId} className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-1 text-[9px] font-semibold text-slate-400">
            {projectId}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ChatShell({ conversationId }: ChatShellProps) {
  // Nano-only: sabit, değiştirilemez
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
      if (file.attachment) {
        if (visionEnabled) {
          setAttachments([...attachments, file.attachment].slice(0, 4));
        }
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
          <p className="text-xs text-indigo-300/60 font-mono mt-2">TXT · DOCX · PDF · EPUB · PNG · JPG · WEBP</p>
        </div>
      )}

      <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between flex-shrink-0 gap-4 backdrop-blur-sm relative z-20">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-xs">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.25em] leading-tight">Aillame Workspace</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                <span className="text-[8px] font-bold text-amber-400/80 uppercase tracking-widest">{chatModel.shortLabel} · diagnostic</span>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-white/5 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-indigo-400/90 transition-colors hover:bg-indigo-500/10">
              <FiCpu size={9} />
              Nano Advisory
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-400/90 transition-colors hover:bg-emerald-500/10">
              <FiShield size={9} />
              Local Only
            </div>
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-amber-400/90 transition-colors hover:bg-amber-500/10">
              <FiZap size={9} />
              Safe Fallback
            </div>
          </div>
        </div>

        <button
          onClick={clearMessages}
          className="p-2 rounded-xl hover:bg-white/5 text-gray-600 hover:text-rose-400 transition-all flex items-center gap-1.5 group flex-shrink-0"
          title="Sohbeti Temizle"
          aria-label="Sohbeti Temizle"
        >
          <FiTrash2 size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            Temizle
          </span>
        </button>
      </div>

      <ProjectContextBar modelLabel={chatModel.shortLabel ?? chatModel.id} />
      <ToolCallBar tools={activeTools} />

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <MessageList messages={messages} loading={loading} listRef={listRef} conversationId={conversationId} />
        {loading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={stopGeneration}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-xs font-bold uppercase tracking-widest shadow-2xl"
            >
              <FiSquare size={10} className="fill-current text-rose-500" />
              <span>Durdur</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-4 bg-gradient-to-t from-black/20 to-transparent flex-shrink-0">
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
