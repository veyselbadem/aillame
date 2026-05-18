'use client';

import { useState } from 'react';
import { FiAlertCircle, FiSquare, FiTrash2 } from 'react-icons/fi';
import type { RefObject } from 'react';
import type { Message } from '@apptypes/message';
import type { ImageAttachment } from '@apptypes/attachments';
import MessageList from '../MessageList';
import ChatInput from '../ChatInput';
import { safeConfirm } from '@/lib/confirm';

interface ChatThreadViewProps {
  messages: Message[];
  loading: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  conversationId: string;
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onClearChat: () => boolean;
  visionEnabled: boolean;
  attachments: ImageAttachment[];
  onAttachmentsChange: (attachments: ImageAttachment[]) => void;
  isModelLoaded: boolean;
  activeModelId?: string | null;
  onLoadModel: () => Promise<{ success: boolean; error?: string }>;
}

function ModelInlineNotice({
  isModelLoaded,
  activeModelId,
  loadError,
  onLoadModel,
}: {
  isModelLoaded: boolean;
  activeModelId?: string | null;
  loadError: string | null;
  onLoadModel: () => Promise<void>;
}) {
  if (isModelLoaded) return null;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-xl shadow-amber-500/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={16} className="text-amber-300" />
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
              Model durumu
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/75">
            {activeModelId
              ? `${activeModelId} seçili, ancak yanıt üretimi için henüz hazır değil. Sohbet akışı açık kalır.`
              : 'Yanıt üretimi için bir model hazırlanmalı. Sohbet akışı açık kalır.'}
          </p>
        </div>

        <button
          onClick={onLoadModel}
          className="shrink-0 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-100 transition hover:bg-amber-300/15"
        >
          Hazırla
        </button>
      </div>

      {loadError && (
        <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">
          {loadError}
        </div>
      )}
    </div>
  );
}

export function ChatThreadView({
  messages,
  loading,
  listRef,
  conversationId,
  input,
  setInput,
  onSend,
  onStop,
  onClearChat,
  visionEnabled,
  attachments,
  onAttachmentsChange,
  isModelLoaded,
  activeModelId,
  onLoadModel,
}: ChatThreadViewProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clearNotice, setClearNotice] = useState<string | null>(null);

  const handleLoadModel = async () => {
    setLoadError(null);
    const result = await onLoadModel();
    if (!result.success) {
      setLoadError(result.error || 'Model hazırlanırken bir hata oluştu.');
    }
  };

  const handleClearChat = async () => {
    if (loading || messages.length === 0) {
      return;
    }

    const confirmed = await safeConfirm(
      'Bu işlem yalnızca ekrandaki mevcut sohbet mesajlarını temizler. Hafıza, proje bağlamı ve öğrenme verileri silinmez.',
      { title: 'Sohbet temizlensin mi?' },
    );

    if (!confirmed) {
      return;
    }

    const cleared = onClearChat();
    if (!cleared) {
      setClearNotice('Yanıt hazırlanırken sohbet temizlenemez.');
      return;
    }

    setClearNotice(null);
  };

  return (
    <div className="chat-thread relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 neural-grid opacity-45" />
      <div className="chat-ambient pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-2 px-5 pt-5 sm:px-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClearChat}
              disabled={loading || messages.length === 0}
              title="Yalnızca ekrandaki sohbet mesajlarını temizler."
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--card-bg)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] shadow-sm transition hover:border-rose-300 hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiTrash2 size={14} />
              <span>Sohbeti Temizle</span>
            </button>
          </div>

          {clearNotice && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
              {clearNotice}
            </div>
          )}
        </div>

        <MessageList
          messages={messages}
          loading={loading}
          listRef={listRef}
          conversationId={conversationId}
          topNotice={
            <ModelInlineNotice
              isModelLoaded={isModelLoaded}
              activeModelId={activeModelId}
              loadError={loadError}
              onLoadModel={handleLoadModel}
            />
          }
        />

        {loading && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <button
              onClick={onStop}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/85 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-2xl backdrop-blur-xl transition hover:border-rose-500/30"
            >
              <FiSquare size={10} className="fill-current text-rose-500" />
              <span>Durdur</span>
            </button>
          </div>
        )}
      </div>

      <div className="chat-input-dock relative z-20 flex-shrink-0 border-t px-4 py-4 backdrop-blur-xl sm:px-5">
        <div className="mx-auto w-full max-w-[900px]">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={onSend}
            disabled={loading}
            visionEnabled={visionEnabled}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
          />
        </div>
      </div>
    </div>
  );
}
