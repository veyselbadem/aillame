'use client';

import { useState } from 'react';
import { FiX, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import type { Message } from '@apptypes/message';
import type { FeedbackRouterMetadata, FeedbackType } from '@core/feedback/types';

interface FeedbackActionsProps {
  message: Message;
  conversationId: string;
}

type FeedbackState = 'idle' | 'submitting' | 'success' | 'error';

export default function FeedbackActions({ message, conversationId }: FeedbackActionsProps) {
  const [open, setOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<FeedbackState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const metadata: FeedbackRouterMetadata | undefined = message.metadata?.routing
    ? {
        primaryMode: message.metadata.routing.primaryMode,
        selectedModes: message.metadata.routing.selectedModes,
        intent: message.metadata.routing.intent,
        requiredAdapters: message.metadata.routing.requiredAdapters,
        memoryScopes: message.metadata.routing.memoryScopes,
        safetyFlags: message.metadata.routing.safetyFlags,
      }
    : undefined;

  const openForm = (feedbackType: FeedbackType) => {
    setSelectedFeedback(feedbackType);
    setOpen(true);
    setStatus('idle');
    setErrorMessage(null);
  };

  const closeForm = () => {
    setOpen(false);
    setComment('');
    setErrorMessage(null);
    setStatus('idle');
    setSelectedFeedback(null);
  };

  const handleSubmit = async () => {
    if (!selectedFeedback) return;

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          conversationId,
          selectedFeedback,
          optionalComment: comment.trim() || undefined,
          metadata,
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'Geri bildirim gönderilemedi.');
      }

      setStatus('success');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Geri bildirim sırasında hata oluştu.';
      setErrorMessage(messageText);
      setStatus('error');
    }
  };

  if (message.role !== 'assistant' || !message.content) {
    return null;
  }

  return (
    <div className="mt-3 text-right">
      <div className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/10 p-2">
        <button
          type="button"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 transition"
          onClick={() => openForm('like')}
          title="Beğendim"
          aria-label="Beğendim"
        >
          <FiThumbsUp size={16} />
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 transition"
          onClick={() => openForm('dislike')}
          title="Beğenmedim"
          aria-label="Beğenmedim"
        >
          <FiThumbsDown size={16} />
        </button>
      </div>

      {open && selectedFeedback && (
        <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/10 relative max-w-[28rem] mx-auto text-left">
          <button
            type="button"
            onClick={closeForm}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
            aria-label="Geri bildirimi kapat"
          >
            <FiX size={16} />
          </button>

          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Geri Bildirim</div>
          <p className="text-sm text-gray-200 mb-3">Bu cevap hakkında düşünceni yazabilirsin.</p>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            placeholder="Yorum eklemek istersen buraya yazabilirsin..."
          />

          <div className="mt-4 flex flex-col gap-2">
            {status === 'success' && (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-200">
                Geri bildirimin kaydedildi.
              </div>
            )}
            {status === 'error' && errorMessage && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}
            <button
              type="button"
              disabled={status === 'submitting' || status === 'success'}
              onClick={handleSubmit}
              className="self-end rounded-2xl bg-indigo-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition disabled:cursor-not-allowed disabled:bg-white/10"
            >
              {status === 'submitting' ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
