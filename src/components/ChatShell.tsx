'use client';

import { useEffect } from 'react';
import { FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { useChat } from '@hooks/useChat';
import { useDragDrop } from '@hooks/useDragDrop';
import { useRuntimeStatus } from '@hooks/useRuntimeStatus';
import { QWEN3_VL_4B_LOCAL_MODEL_ID, getChatModelForTier, modelSupports } from '@core/models/registry';
import { LandingView } from './chat/LandingView';
import { ChatThreadView } from './chat/ChatThreadView';
import {
  MANUAL_CONTEXT_ATTACH_EVENT,
  ManualContextAttachEventDetail,
} from '@lib/manual-context-attach-events';

interface ChatShellProps {
  conversationId: string;
}

export default function ChatShell({ conversationId }: ChatShellProps) {
  const llmMode: 'local' = 'local';
  const tier: 'nano' = 'nano';
  const chatModel = getChatModelForTier(tier);
  const visionEnabled =
    modelSupports(chatModel.id, 'vision-image-understanding') ||
    modelSupports(QWEN3_VL_4B_LOCAL_MODEL_ID, 'vision-image-understanding');
  const { session, loadModel } = useRuntimeStatus();

  const {
    messages,
    setMessages,
    input,
    setInput,
    attachments,
    setAttachments,
    sendMessage,
    stopGeneration,
    clearChat,
    loading,
    listRef,
  } = useChat(conversationId, { llmMode, tier });

  useEffect(() => {
    const onManualContextAttach = (event: Event) => {
      const customEvent = event as CustomEvent<ManualContextAttachEventDetail>;
      const attachedText = customEvent.detail?.text?.trim();
      if (!attachedText) return;

      setInput((prev) => {
        if (!prev.trim()) return attachedText;
        return `${prev}\n\n${attachedText}`;
      });
    };

    window.addEventListener(MANUAL_CONTEXT_ATTACH_EVENT, onManualContextAttach);
    return () => {
      window.removeEventListener(MANUAL_CONTEXT_ATTACH_EVENT, onManualContextAttach);
    };
  }, [setInput]);

  const { isDragOver, dragHandlers } = useDragDrop({
    onFileProcessed: (file) => {
      // Replace any existing attachment — single-image rule
      if (file.attachment && visionEnabled) {
        setAttachments([file.attachment]);
      }
    },
    onMessage: (text) => {
      // Surface validation errors (wrong type, oversized, multi-file) as assistant messages
      const systemMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    },
  });

  const dragOverlay = isDragOver ? (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-600/10 backdrop-blur-md">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-indigo-500/30 bg-indigo-600/20">
        <FiUploadCloud size={32} className="animate-bounce text-indigo-400" />
      </div>
      <p className="text-lg font-black uppercase tracking-widest text-white">Dosyayı Bırak</p>
      <p className="mt-2 text-xs font-mono text-indigo-300/70">
        TXT · DOCX · PDF · EPUB · PNG · JPG · WEBP
      </p>
    </div>
  ) : null;

  const isLanding = messages.length === 0;

  return (
    <div
      className="chat-shell relative flex h-full w-full flex-col overflow-hidden rounded-[inherit]"
      {...dragHandlers}
    >
      {dragOverlay}

      {isLanding && (
        <div className="pointer-events-none absolute right-5 top-5 z-30">
          <button
            type="button"
            disabled
            title="Yalnızca ekrandaki sohbet mesajlarını temizler."
            className="pointer-events-auto inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--card-bg)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] opacity-50 shadow-sm"
          >
            <FiTrash2 size={14} />
            <span>Sohbeti Temizle</span>
          </button>
        </div>
      )}

      {isLanding ? (
        <LandingView
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          disabled={loading}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          visionEnabled={visionEnabled}
        />
      ) : (
        <ChatThreadView
          messages={messages}
          loading={loading}
          listRef={listRef}
          conversationId={conversationId}
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          onStop={stopGeneration}
          onClearChat={clearChat}
          visionEnabled={visionEnabled}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          isModelLoaded={session?.isLoaded === true}
          activeModelId={session?.activeModelId}
          onLoadModel={loadModel}
        />
      )}
    </div>
  );
}
