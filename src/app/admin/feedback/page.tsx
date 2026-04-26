'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiThumbsUp, FiRefreshCw } from 'react-icons/fi';
import type { FeedbackRecord } from '@core/feedback/types';
import type { AillameMode, AillameIntent } from '@core/aillame-router/types';

const MODE_OPTIONS: Array<{ value: AillameMode | 'all'; label: string }> = [
  { value: 'all', label: 'Hepsi' },
  { value: 'general', label: 'General' },
  { value: 'education', label: 'Education' },
  { value: 'code', label: 'Code' },
  { value: 'economy', label: 'Economy' },
];

const FEEDBACK_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'like', label: 'Like' },
  { value: 'dislike', label: 'Dislike' },
] as const;

type FeedbackFilter = (typeof FEEDBACK_OPTIONS)[number]['value'];

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [filterType, setFilterType] = useState<FeedbackFilter>('all');
  const [modeFilter, setModeFilter] = useState<AillameMode | 'all'>('all');
  const [intentFilter, setIntentFilter] = useState<AillameIntent | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setAuthorized(true);
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/feedback');
      if (!response.ok) {
        throw new Error('Geri bildirimler yüklenemedi.');
      }
      const result = await response.json();
      if (!result?.success || !Array.isArray(result.feedback)) {
        throw new Error('Geri bildirim verisi geçersiz.');
      }
      setFeedbacks(result.feedback);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Geri bildirim yüklenirken hata oluştu.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const availableIntents = useMemo(() => {
    const intents = new Set<string>();
    feedbacks.forEach((item) => {
      const intent = item.metadata?.intent ?? item.metadata?.primaryMode;
      if (intent) intents.add(intent);
    });
    return Array.from(intents) as AillameIntent[];
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    return [...feedbacks]
      .filter((item) => {
        if (filterType !== 'all' && item.selectedFeedback !== filterType) {
          return false;
        }

        if (modeFilter !== 'all') {
          return item.metadata?.selectedModes?.includes(modeFilter) ?? false;
        }

        if (intentFilter !== 'all') {
          return item.metadata?.intent === intentFilter;
        }

        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [feedbacks, filterType, modeFilter, intentFilter]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FiThumbsUp size={12} className="text-emerald-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Insights · User Feedback</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Geri Bildirimler</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl font-medium">Kullanıcı etkileşimlerinden gelen like/dislike ve yorumları analiz edin.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => loadFeedback()} className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-emerald-400 transition-all">
             <FiRefreshCw className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} /> Yenile
           </button>
        </div>
      </header>

      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">Feedback Türü</p>
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as FeedbackFilter)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {FEEDBACK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">Mod</p>
          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as AillameMode | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">Intent</p>
          <select
            value={intentFilter}
            onChange={(event) => setIntentFilter(event.target.value as AillameIntent | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            <option value="all">Hepsi</option>
            {availableIntents.map((intent) => (
              <option key={intent} value={intent}>{intent}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Henüz geri bildirim yok.</div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((item) => {
            const isDislike = item.selectedFeedback === 'dislike';
            const routing = item.metadata;
            return (
              <div
                key={`${item.conversationId}-${item.messageId}`}
                className={`rounded-3xl border p-5 shadow-xl transition ${isDislike ? 'border-rose-500/30 bg-rose-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.3em] ${isDislike ? 'bg-rose-500/15 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'}`}>
                        {item.selectedFeedback.toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${isDislike ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                        {isDislike ? 'İyileştirme Adayı' : 'Pozitif Öğrenme Adayı'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{item.optionalComment ?? 'Yorum yok.'}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 font-mono space-y-1">
                    <div>Oturum: {item.conversationId}</div>
                    <div>Mesaj ID: {item.messageId}</div>
                    <div>{formatDate(item.createdAt)}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Mode</p>
                    <p className="text-sm text-white">{routing?.primaryMode ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-2">Selected: {routing?.selectedModes?.join(', ') ?? '—'}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Intent</p>
                    <p className="text-sm text-white">{routing?.intent ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-2">Adapters: {routing?.requiredAdapters?.join(', ') ?? '—'}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Memory Scopes</p>
                    <p className="text-sm text-white">{routing?.memoryScopes?.join(', ') ?? '—'}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/10 p-4 md:col-span-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Safety Flags</p>
                    <div className="flex flex-wrap gap-2">
                      {routing?.safetyFlags ? (
                        Object.entries(routing.safetyFlags).map(([key, value]) => (
                          <span key={key} className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-gray-300">
                            {key}: {String(value)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
