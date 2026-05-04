'use client';

import { useState } from 'react';
import { FiX, FiThumbsUp, FiThumbsDown, FiCheck } from 'react-icons/fi';
import type { Message } from '@apptypes/message';

interface FeedbackActionsProps {
  message: Message;
  conversationId: string;
  promptText?: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

type FeedbackV2Payload = {
  projectId: string;
  conversationId: string;
  responseId: string;
  mode: string;
  task: string;
  modelId?: string;
  runtime?: undefined;
  rating: 'positive' | 'negative';
  feedbackText?: string;
  correctedAnswer?: string;
  promptSnapshot?: string;
  answerSnapshot?: string;
  datasetEligible: boolean;
  sensitive: boolean;
  source: 'feedback_ui';
  tags: string[];
};

export default function FeedbackActions({ message, conversationId, promptText }: FeedbackActionsProps) {
  const [positiveState, setPositiveState] = useState<SubmitState>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [correctedAnswer, setCorrectedAnswer] = useState('');
  const [datasetEligible, setDatasetEligible] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [includeSnapshot, setIncludeSnapshot] = useState(false);
  const [negativeState, setNegativeState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (message.role !== 'assistant' || !message.content) {
    return null;
  }

  const routing = message.metadata?.routing;
  const mode = routing?.primaryMode ?? 'general';
  const task = routing?.intent ?? 'feedback';
  const modelId = routing?.requiredAdapters?.[0] as string | undefined;

  const buildBasePayload = (): Omit<FeedbackV2Payload, 'rating' | 'tags'> => ({
    projectId: 'aillame-local',
    conversationId,
    responseId: message.id,
    mode,
    task,
    modelId,
    runtime: undefined,
    source: 'feedback_ui',
    datasetEligible: false,
    sensitive: false,
  });

  const postFeedback = async (payload: FeedbackV2Payload): Promise<void> => {
    const response = await fetch('/api/aillame/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok || data?.error) {
      throw new Error(data?.error ?? 'Geri bildirim gönderilemedi.');
    }
  };

  const handlePositive = async () => {
    if (positiveState === 'submitting' || positiveState === 'success') return;
    setPositiveState('submitting');
    try {
      await postFeedback({
        ...buildBasePayload(),
        rating: 'positive',
        datasetEligible: true,
        sensitive: false,
        tags: ['ui', 'positive'],
      });
      setPositiveState('success');
    } catch {
      setPositiveState('error');
      setTimeout(() => setPositiveState('idle'), 3000);
    }
  };

  const openNegativeModal = () => {
    setModalOpen(true);
    setFeedbackText('');
    setCorrectedAnswer('');
    setDatasetEligible(false);
    setSensitive(false);
    setIncludeSnapshot(false);
    setNegativeState('idle');
    setErrorMessage(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setErrorMessage(null);
    setNegativeState('idle');
  };

  const handleNegativeSubmit = async () => {
    if (negativeState === 'submitting' || negativeState === 'success') return;
    setNegativeState('submitting');
    setErrorMessage(null);
    try {
      await postFeedback({
        ...buildBasePayload(),
        rating: 'negative',
        feedbackText: feedbackText.trim() || undefined,
        correctedAnswer: correctedAnswer.trim() || undefined,
        promptSnapshot: includeSnapshot ? promptText : undefined,
        answerSnapshot: includeSnapshot ? message.content : undefined,
        datasetEligible,
        sensitive,
        tags: ['ui', 'negative'],
      });
      setNegativeState('success');
      setTimeout(() => closeModal(), 1200);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Geri bildirim sırasında hata oluştu.';
      setErrorMessage(text);
      setNegativeState('error');
    }
  };

  return (
    <div className="mt-3 text-right">
      <div className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/10 p-2">
        <button
          type="button"
          className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition ${
            positiveState === 'success'
              ? 'text-emerald-300 bg-emerald-500/30'
              : positiveState === 'submitting'
                ? 'text-emerald-400/50 bg-emerald-500/10 cursor-not-allowed'
                : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
          }`}
          onClick={handlePositive}
          disabled={positiveState === 'submitting' || positiveState === 'success'}
          title="Beğendim"
          aria-label="Beğendim"
        >
          {positiveState === 'success' ? <FiCheck size={16} /> : <FiThumbsUp size={16} />}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 transition"
          onClick={openNegativeModal}
          title="Beğenmedim"
          aria-label="Beğenmedim"
        >
          <FiThumbsDown size={16} />
        </button>
      </div>

      {modalOpen && (
        <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/10 relative max-w-[28rem] mx-auto text-left">
          <button
            type="button"
            onClick={closeModal}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
            aria-label="Geri bildirimi kapat"
          >
            <FiX size={16} />
          </button>
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Geri Bildirim</div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 mb-3"
            placeholder="Neyi beğenmedin?"
          />
          <textarea
            value={correctedAnswer}
            onChange={(e) => setCorrectedAnswer(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 mb-3"
            placeholder="Daha iyi cevap nasıl olmalıydı?"
          />
          <div className="flex flex-col gap-2 mb-4 text-sm text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={datasetEligible} onChange={(e) => setDatasetEligible(e.target.checked)} className="rounded border-white/20 bg-black/20 text-indigo-500 focus:ring-indigo-400/20" />
              Dataset için kullanılabilir
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} className="rounded border-white/20 bg-black/20 text-indigo-500 focus:ring-indigo-400/20" />
              Hassas veri içeriyor
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={includeSnapshot} onChange={(e) => setIncludeSnapshot(e.target.checked)} className="rounded border-white/20 bg-black/20 text-indigo-500 focus:ring-indigo-400/20" />
              Mesaj içeriğini dataset için ekle
            </label>
          </div>
          <div className="flex flex-col gap-2">
            {negativeState === 'success' && (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-200">Geri bildirimin kaydedildi.</div>
            )}
            {negativeState === 'error' && errorMessage && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-200">{errorMessage}</div>
            )}
            <button
              type="button"
              disabled={negativeState === 'submitting' || negativeState === 'success'}
              onClick={handleNegativeSubmit}
              className="self-end rounded-2xl bg-indigo-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition disabled:cursor-not-allowed disabled:bg-white/10"
            >
              {negativeState === 'submitting' ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
