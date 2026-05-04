'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiThumbsUp,
  FiRefreshCw,
  FiAlertTriangle,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiDatabase,
} from 'react-icons/fi';
import type { FeedbackRecord } from '@core/feedback/types';
import { getFeedbackLearningCandidateEligibility } from '@core/feedback/bridge-rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RatingFilter = 'all' | 'positive' | 'negative';
type BoolFilter = 'all' | 'yes' | 'no';
type LearningBridgeStatus = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

type LearningBridgeState = {
  status: LearningBridgeStatus;
  message?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

function buildExportUrl(projectId: string, includeSensitive: boolean): string {
  const params = new URLSearchParams({ format: 'jsonl' });
  if (projectId !== 'all') params.set('projectId', projectId);
  if (includeSensitive) params.set('includeSensitive', 'true');
  return `/api/aillame/feedback/export?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// FeedbackCard
// ---------------------------------------------------------------------------
function FeedbackCard({
  item,
  onCreateLearningCandidate,
  learningBridgeState,
}: {
  item: FeedbackRecord;
  onCreateLearningCandidate: (item: FeedbackRecord) => Promise<void>;
  learningBridgeState?: LearningBridgeState;
}) {
  const [showSnapshot, setShowSnapshot] = useState(false);
  const isNegative = item.rating === 'negative';
  const hasSnapshot = Boolean(item.promptSnapshot ?? item.answerSnapshot);
  const learningEligibility = getFeedbackLearningCandidateEligibility(item);
  const bridgeStatus = learningBridgeState?.status ?? 'idle';
  const bridgeMessage = learningBridgeState?.message;

  return (
    <div
      className={`rounded-3xl border p-5 shadow-xl transition ${
        isNegative ? 'border-rose-500/30 bg-rose-500/10' : 'border-emerald-500/20 bg-emerald-500/5'
      }`}
    >
      {/* Top row: badges + meta */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.3em] ${
                isNegative ? 'bg-rose-500/15 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {item.rating ?? '—'}
            </span>
            {item.datasetEligible ? (
              <span className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                Dataset ✓
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
                Dataset ✗
              </span>
            )}
            {item.sensitive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                <FiAlertTriangle size={10} /> Hassas
              </span>
            )}
            {hasSnapshot && (
              <span className="inline-flex items-center rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                Snapshot
              </span>
            )}
            {item.source && (
              <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-1 text-[10px] font-mono text-gray-300">
                {item.source}
              </span>
            )}
          </div>

          {/* feedbackText */}
          {item.feedbackText ? (
            <p className="max-w-2xl whitespace-pre-wrap break-words text-sm text-gray-300">
              <span className="mr-2 text-[10px] uppercase tracking-widest text-gray-400">Geri Bildirim:</span>
              {item.feedbackText}
            </p>
          ) : item.optionalComment ? (
            <p className="max-w-2xl whitespace-pre-wrap break-words text-sm text-gray-400">
              <span className="mr-2 text-[10px] uppercase tracking-widest text-gray-400">Yorum:</span>
              {item.optionalComment}
            </p>
          ) : null}

          {/* correctedAnswer */}
          {item.correctedAnswer && (
            <div className="mt-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-amber-400">Düzeltilmiş Yanıt</p>
              <p className="whitespace-pre-wrap break-words text-sm text-amber-100">{item.correctedAnswer}</p>
            </div>
          )}
        </div>

        {/* Right meta */}
        <div className="shrink-0 space-y-1 text-right font-mono text-xs text-gray-400">
          <div>{formatDate(item.createdAt)}</div>
          <div>id: {shortId(item.id)}</div>
          {item.projectId && <div>proj: {item.projectId}</div>}
          {item.mode && <div>mode: {item.mode}</div>}
          {item.task && <div>task: {item.task}</div>}
        </div>
      </div>

      {/* Snapshot toggle */}
      {hasSnapshot && (
        <div className="mt-4">
          <button
            onClick={() => setShowSnapshot((v) => !v)}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-violet-400 transition-colors hover:text-violet-300"
          >
            {showSnapshot ? <FiEyeOff size={12} /> : <FiEye size={12} />}
            {showSnapshot ? 'Snapshot Gizle' : 'Snapshot Göster'}
          </button>
          {showSnapshot && (
            <div className="mt-3 space-y-3">
              {item.promptSnapshot && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-violet-300">Prompt Snapshot</p>
                  <p className="whitespace-pre-wrap break-words text-xs text-gray-100">{item.promptSnapshot}</p>
                </div>
              )}
              {item.answerSnapshot && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-violet-300">Answer Snapshot</p>
                  <p className="whitespace-pre-wrap break-words text-xs text-gray-100">{item.answerSnapshot}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => { void onCreateLearningCandidate(item); }}
          disabled={!learningEligibility.eligible || bridgeStatus === 'loading'}
          className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-100 transition-all hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/5 disabled:text-gray-300 disabled:opacity-70"
        >
          {bridgeStatus === 'loading' ? 'Gönderiliyor...' : 'Learning Candidate’a Gönder'}
        </button>

        {!learningEligibility.eligible && (
          <p className="text-[11px] text-amber-200">
            {item.sensitive
              ? 'Hassas kayıtlar bu fazda manuel bridge dışında tutulur.'
              : 'Bu kayıt learning candidate kurallarını karşılamıyor.'}
          </p>
        )}

        {bridgeStatus === 'success' && (
          <p className="text-[11px] text-emerald-200">Learning Candidate oluşturuldu.</p>
        )}
        {bridgeStatus === 'duplicate' && (
          <p className="text-[11px] text-amber-200">Zaten candidate oluşturulmuş.</p>
        )}
        {bridgeStatus === 'error' && bridgeMessage && (
          <p className="text-[11px] text-rose-200">{bridgeMessage}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminFeedbackPage() {
  const adminTokenKey = 'aillame_admin_token';
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  // Filters
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [datasetFilter, setDatasetFilter] = useState<BoolFilter>('all');
  const [sensitiveFilter, setSensitiveFilter] = useState<BoolFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Export state
  const [exportProjectId, setExportProjectId] = useState<string>('all');
  const [exportIncludeSensitive, setExportIncludeSensitive] = useState(false);
  const [exportPreview, setExportPreview] = useState<string[] | null>(null);
  const [exportTotalLines, setExportTotalLines] = useState<number>(0);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
  const [exportDownloadLoading, setExportDownloadLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [learningBridgeMap, setLearningBridgeMap] = useState<Record<string, LearningBridgeState>>({});

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    const token = localStorage.getItem(adminTokenKey)?.trim();
    if (!token) {
      setError('Admin token bulunamadı. Lütfen tekrar giriş yapın.');
      router.push('/admin/login');
      return;
    }
    setAuthorized(true);
    void loadFeedback(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getAdminToken = (): string | null => {
    const token = localStorage.getItem(adminTokenKey)?.trim();
    if (!token) {
      setError('Admin token bulunamadı. Lütfen tekrar giriş yapın.');
      router.push('/admin/login');
      return null;
    }
    return token;
  };

  const loadFeedback = async (providedToken?: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = providedToken ?? getAdminToken();
      if (!token) return;
      const response = await fetch('/api/aillame/feedback', {
        headers: { 'x-aillame-admin-token': token },
      });
      if (!response.ok) throw new Error('Geri bildirimler yüklenemedi.');
      const result = (await response.json()) as { success: boolean; feedback: FeedbackRecord[] };
      if (!result?.success || !Array.isArray(result.feedback)) throw new Error('Geri bildirim verisi geçersiz.');
      setFeedbacks(result.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Geri bildirim yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Unique filter options derived from data
  const uniqueProjects = useMemo(() => {
    const s = new Set<string>();
    feedbacks.forEach((f) => { if (f.projectId) s.add(f.projectId); });
    return Array.from(s).sort();
  }, [feedbacks]);

  const uniqueSources = useMemo(() => {
    const s = new Set<string>();
    feedbacks.forEach((f) => { if (f.source) s.add(f.source); });
    return Array.from(s).sort();
  }, [feedbacks]);

  // Summary
  const summary = useMemo(() => ({
    total: feedbacks.length,
    positive: feedbacks.filter((f) => f.rating === 'positive').length,
    negative: feedbacks.filter((f) => f.rating === 'negative').length,
    eligible: feedbacks.filter((f) => f.datasetEligible).length,
    sensitive: feedbacks.filter((f) => f.sensitive).length,
  }), [feedbacks]);

  // Filtered + sorted list
  const filteredFeedbacks = useMemo(() => {
    return feedbacks
      .filter((f) => ratingFilter === 'all' || f.rating === ratingFilter)
      .filter((f) => datasetFilter === 'all' || (datasetFilter === 'yes' ? f.datasetEligible : !f.datasetEligible))
      .filter((f) => sensitiveFilter === 'all' || (sensitiveFilter === 'yes' ? f.sensitive : !f.sensitive))
      .filter((f) => sourceFilter === 'all' || f.source === sourceFilter)
      .filter((f) => projectFilter === 'all' || f.projectId === projectFilter)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [feedbacks, ratingFilter, datasetFilter, sensitiveFilter, sourceFilter, projectFilter]);

  // Export handlers
  const handleExportPreview = async () => {
    setExportPreviewLoading(true);
    setExportError(null);
    setExportPreview(null);
    try {
      const token = getAdminToken();
      if (!token) return;
      const url = buildExportUrl(exportProjectId, exportIncludeSensitive);
      const res = await fetch(url, {
        headers: { 'x-aillame-admin-token': token },
      });
      if (!res.ok) throw new Error(`Export başarısız: ${res.status}`);
      const text = await res.text();
      const lines = text.split('\n').filter(Boolean);
      setExportTotalLines(lines.length);
      setExportPreview(lines.slice(0, 10));
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export önizlemesi alınamadı.');
    } finally {
      setExportPreviewLoading(false);
    }
  };

  const handleExportDownload = async () => {
    setExportDownloadLoading(true);
    setExportError(null);
    try {
      const token = getAdminToken();
      if (!token) return;
      const url = buildExportUrl(exportProjectId, exportIncludeSensitive);
      const res = await fetch(url, {
        headers: { 'x-aillame-admin-token': token },
      });
      if (!res.ok) throw new Error(`Export başarısız: ${res.status}`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/x-ndjson' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename =
        exportProjectId !== 'all' ? `feedback-export-${exportProjectId}.jsonl` : 'feedback-export.jsonl';
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export indirme başarısız.');
    } finally {
      setExportDownloadLoading(false);
    }
  };

  const handleCreateLearningCandidate = async (feedback: FeedbackRecord) => {
    const eligibility = getFeedbackLearningCandidateEligibility(feedback);
    if (!eligibility.eligible) {
      setLearningBridgeMap((current) => ({
        ...current,
        [feedback.id]: {
          status: 'error',
          message: feedback.sensitive
            ? 'Hassas kayıtlar bu fazda includeSensitive olmadan dönüştürülemez.'
            : 'Bu feedback kaydı learning candidate için uygun değil.',
        },
      }));
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    setLearningBridgeMap((current) => ({
      ...current,
      [feedback.id]: { status: 'loading' },
    }));

    try {
      const response = await fetch('/api/admin/feedback/bridge/learning-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-aillame-admin-token': token,
        },
        body: JSON.stringify({
          feedbackId: feedback.id,
          includeSensitive: false,
          reason: 'Admin selected this feedback as learning candidate.',
        }),
      });

      const result = await response.json() as { error?: string };

      if (response.status === 409) {
        setLearningBridgeMap((current) => ({
          ...current,
          [feedback.id]: { status: 'duplicate' },
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Learning candidate oluşturulamadı.');
      }

      setLearningBridgeMap((current) => ({
        ...current,
        [feedback.id]: { status: 'success' },
      }));
    } catch (err) {
      setLearningBridgeMap((current) => ({
        ...current,
        [feedback.id]: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Learning candidate oluşturulurken hata oluştu.',
        },
      }));
    }
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto">

      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FiThumbsUp size={12} className="text-emerald-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Admin · Feedback Dataset</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Feedback Dataset Yönetimi</h1>
          <p className="text-sm text-gray-300 mt-2 max-w-2xl font-medium">
            v2 feedback kayıtlarını inceleyin, filtreleyin ve dataset export işlemlerini yönetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { void loadFeedback(); }}
            className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-emerald-400 transition-all"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            Yenile
          </button>
        </div>
      </header>

      {/* Warning banner */}
      <div className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <FiAlertTriangle className="shrink-0 mt-0.5 text-amber-400" size={16} />
        <div className="space-y-1 text-xs text-amber-200">
          <p>
            <span className="font-bold">Veri Hassasiyeti:</span>{' '}
            Sensitive olarak işaretli kayıtlar varsayılan export dışında kalır (includeSensitive=false).
          </p>
          <p>
            <span className="font-bold">Snapshot:</span>{' '}
            Prompt ve answer snapshot alanları gerçek kullanıcı mesajları içerebilir. Export almadan önce veriyi inceleyin.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-5">
        {([
          { label: 'Toplam', value: summary.total, color: 'text-white' },
          { label: 'Positive', value: summary.positive, color: 'text-emerald-400' },
          { label: 'Negative', value: summary.negative, color: 'text-rose-400' },
          { label: 'Dataset Eligible', value: summary.eligible, color: 'text-sky-400' },
          { label: 'Hassas', value: summary.sensitive, color: 'text-amber-300' },
        ] as const).map((card) => (
          <div key={card.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">{card.label}</p>
            <p className={`text-3xl font-black ${card.color}`}>{loading ? '—' : card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Rating</p>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
          >
            <option value="all">Tümü</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Dataset Eligible</p>
          <select
            value={datasetFilter}
            onChange={(e) => setDatasetFilter(e.target.value as BoolFilter)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
          >
            <option value="all">Tümü</option>
            <option value="yes">Evet</option>
            <option value="no">Hayır</option>
          </select>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Hassas</p>
          <select
            value={sensitiveFilter}
            onChange={(e) => setSensitiveFilter(e.target.value as BoolFilter)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
          >
            <option value="all">Tümü</option>
            <option value="yes">Evet</option>
            <option value="no">Hayır</option>
          </select>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Source</p>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
          >
            <option value="all">Tümü</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Project</p>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
          >
            <option value="all">Tümü</option>
            {uniqueProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fetch error */}
      {error && (
        <div className="mb-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100">
          {error}
        </div>
      )}

      {/* Feedback list */}
      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
          Yükleniyor...
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
          {feedbacks.length === 0 ? 'Henüz feedback kaydı yok.' : 'Seçili filtrelere uyan kayıt bulunamadı.'}
        </div>
      ) : (
        <div className="mb-12 space-y-4">
          <p className="mb-2 text-xs text-gray-400">
            {filteredFeedbacks.length} / {feedbacks.length} kayıt gösteriliyor
          </p>
          {filteredFeedbacks.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onCreateLearningCandidate={handleCreateLearningCandidate}
              learningBridgeState={learningBridgeMap[item.id]}
            />
          ))}
        </div>
      )}

      {/* Export panel */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <FiDatabase size={14} className="text-sky-400" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-sky-400">Dataset Export</h2>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gray-400">Project</p>
            <select
              value={exportProjectId}
              onChange={(e) => {
                setExportProjectId(e.target.value);
                setExportPreview(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
            >
              <option value="all">Tümü (projectId filtresi yok)</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              id="includeSensitive"
              type="checkbox"
              checked={exportIncludeSensitive}
              onChange={(e) => {
                setExportIncludeSensitive(e.target.checked);
                setExportPreview(null);
              }}
              className="h-4 w-4 rounded accent-amber-400"
            />
            <label htmlFor="includeSensitive" className="cursor-pointer text-xs text-gray-300">
              Hassas kayıtları dahil et
              <span className="ml-1 text-[10px] text-amber-400">(varsayılan: kapalı)</span>
            </label>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <button
            onClick={() => { void handleExportPreview(); }}
            disabled={exportPreviewLoading}
            className="flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-2.5 text-xs font-bold text-sky-300 transition-all hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiEye size={12} className={exportPreviewLoading ? 'animate-pulse' : ''} />
            {exportPreviewLoading ? 'Yükleniyor...' : 'Önizle (ilk 10 satır)'}
          </button>
          <button
            onClick={() => { void handleExportDownload(); }}
            disabled={exportDownloadLoading}
            className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload size={12} className={exportDownloadLoading ? 'animate-bounce' : ''} />
            {exportDownloadLoading ? 'İndiriliyor...' : 'JSONL İndir'}
          </button>
        </div>

        {exportError && (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
            {exportError}
          </div>
        )}

        {exportPreview !== null && (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gray-400">
              Önizleme — {exportPreview.length} / {exportTotalLines} satır gösteriliyor
              {exportTotalLines === 0 && ' (export boş)'}
            </p>
            {exportPreview.length > 0 ? (
              <textarea
                readOnly
                value={exportPreview.join('\n')}
                rows={Math.min(exportPreview.length + 1, 12)}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-gray-300 whitespace-pre"
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs text-gray-300">
                Export boş. datasetEligible=true ve output alanı dolu kayıt bulunamadı.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
