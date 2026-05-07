'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  LearningCandidate,
  LearningCandidateStatus,
  LearningCandidateType,
} from '@core/learning-candidates/types';
import type { AillameMode } from '@core/aillame-router/types';
import { FiBook, FiRefreshCw } from 'react-icons/fi';
import StatusBadge from '@components/ui/StatusBadge';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';

const STATUS_OPTIONS: Array<{ value: LearningCandidateStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'archived', label: 'Arşivlendi' },
];

const TYPE_OPTIONS: Array<{ value: LearningCandidateType | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'positive_learning_candidate', label: 'Pozitif Öğrenme Adayı' },
  { value: 'improvement_candidate', label: 'İyileştirme Adayı' },
];

const MODE_OPTIONS: Array<{ value: AillameMode | 'all'; label: string }> = [
  { value: 'all', label: 'Hepsi' },
  { value: 'general', label: 'General' },
  { value: 'education', label: 'Education' },
  { value: 'code', label: 'Code' },
  { value: 'economy', label: 'Economy' },
];

const statusToVariant = (status: LearningCandidateStatus) => {
  switch (status) {
    case 'pending': return 'pending' as const;
    case 'approved': return 'active' as const;
    case 'rejected': return 'failed' as const;
    case 'archived': return 'cancelled' as const;
  }
};

const statusLabel = (status: LearningCandidateStatus): string => {
  switch (status) {
    case 'pending': return 'Beklemede';
    case 'approved': return 'Onaylandı';
    case 'rejected': return 'Reddedildi';
    case 'archived': return 'Arşivlendi';
  }
};

export default function AdminLearningCandidatesPage() {
  const [candidates, setCandidates] = useState<LearningCandidate[]>([]);
  const [filterStatus, setFilterStatus] = useState<LearningCandidateStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<LearningCandidateType | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<AillameMode | 'all'>('all');
  const [intentFilter, setIntentFilter] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = requireAdminTokenOrRedirect(router);
    if (!token) return;
    setAuthorized(true);
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch('/api/learning-candidates');
      if (response.status === 401) { router.push('/admin/login'); return; }
      if (!response.ok) {
        throw new Error('Learning candidate verisi yüklenemedi.');
      }
      const result = await response.json();
      if (!result?.success || !Array.isArray(result.candidates)) {
        throw new Error('Learning candidate verisi geçersiz.');
      }
      setCandidates(result.candidates);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Learning candidate yüklenirken hata oluştu.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: LearningCandidateStatus) => {
    setActionMessage(null);
    setUpdatingId(id);
    try {
      const response = await adminFetch('/api/learning-candidates', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Durum güncellenemedi.');
      }

      setCandidates((current) =>
        current.map((candidate) => (candidate.id === id ? result.candidate : candidate))
      );
      setActionMessage('Durum başarıyla güncellendi.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Durum güncellenirken hata oluştu.';
      setActionMessage(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreatePreview = async (candidate: LearningCandidate) => {
    setActionMessage(null);
    setUpdatingId(candidate.id);
    try {
      const response = await adminFetch('/api/distillation-preview', {
        method: 'POST',
        body: JSON.stringify(candidate),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Distillation preview oluşturulamadı.');
      }

      setActionMessage('Distillation preview başarıyla oluşturuldu.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Distillation preview oluşturulurken hata oluştu.';
      setActionMessage(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const availableIntents = useMemo(() => {
    const intents = new Set<string>();
    candidates.forEach((candidate) => {
      if (candidate.intent) intents.add(candidate.intent);
    });
    return Array.from(intents);
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return [...candidates]
      .filter((candidate) => {
        if (filterStatus !== 'all' && candidate.status !== filterStatus) {
          return false;
        }
        if (filterType !== 'all' && candidate.type !== filterType) {
          return false;
        }
        if (modeFilter !== 'all' && candidate.primaryMode !== modeFilter) {
          return false;
        }
        if (intentFilter !== 'all' && candidate.intent !== intentFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [candidates, filterStatus, filterType, modeFilter, intentFilter]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!authorized) return null;

  return (
    <div className="theme-admin-page min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FiBook size={12} className="text-indigo-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Intelligence · Learning Pipeline</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Öğrenme Adayları</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl font-medium">Sistemin gelişim süreci için feedbacklerden türetilen aday kayıtlarını yönetin.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => loadCandidates()} className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-indigo-400 transition-all">
             <FiRefreshCw className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} /> Yenile
           </button>
        </div>
      </header>

      {/* Pipeline flow */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-emerald-300 font-semibold">Feedback</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-indigo-200 font-black">Learning Candidate</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Distillation Preview</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Memory Write Queue</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Memory Card</span>
      </div>

      {/* Review required notice */}
      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
        <span className="text-amber-400 text-sm">⚠</span>
        <p className="text-xs text-amber-200"><span className="font-black">Review Required</span> · Auto memory write devre dışı. Tüm geçişler manuel onay gerektirir.</p>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">Status</p>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as LearningCandidateStatus | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">Type</p>
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as LearningCandidateType | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {TYPE_OPTIONS.map((option) => (
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
            onChange={(event) => setIntentFilter(event.target.value as string | 'all')}
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
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100 mb-6">
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 mb-6">
          {actionMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : filteredCandidates.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Henüz öğrenme adayı yok.</div>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                      {candidate.type === 'positive_learning_candidate' ? 'Pozitif' : 'İyileştirme'}
                    </span>
                    <StatusBadge variant={statusToVariant(candidate.status)} label={statusLabel(candidate.status)} />
                  </div>
                  <p className="text-sm text-gray-300">{candidate.reason}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={updatingId === candidate.id}
                    onClick={() => handleStatusUpdate(candidate.id, 'approved')}
                    className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === candidate.id}
                    onClick={() => handleStatusUpdate(candidate.id, 'rejected')}
                    className="rounded-2xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === candidate.id}
                    onClick={() => handleStatusUpdate(candidate.id, 'archived')}
                    className="rounded-2xl bg-slate-500/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Archive
                  </button>
                </div>
                {candidate.status === 'approved' ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={updatingId === candidate.id}
                      onClick={() => handleCreatePreview(candidate)}
                      className="rounded-2xl bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Preview Oluştur
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Source Feedback</p>
                  <p className="text-sm text-white break-all">{candidate.sourceFeedbackId}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Feedback</p>
                  <p className="text-sm text-white">{candidate.selectedFeedback}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Konuşma</p>
                  <p className="text-sm text-white">{candidate.conversationId}</p>
                  <p className="text-xs text-gray-500 mt-2">Mesaj ID: {candidate.messageId}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Mode / Intent</p>
                  <p className="text-sm text-white">{candidate.primaryMode ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-2">Intent: {candidate.intent ?? '—'}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Dates</p>
                  <p className="text-sm text-white">Oluşturuldu: {formatDate(candidate.createdAt)}</p>
                  <p className="text-xs text-gray-500 mt-2">Güncellendi: {formatDate(candidate.updatedAt)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Adapters</p>
                  <p className="text-sm text-white">{candidate.requiredAdapters?.join(', ') ?? '—'}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Memory Scopes</p>
                  <p className="text-sm text-white">{candidate.memoryScopes?.join(', ') ?? '—'}</p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Safety Flags</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.safetyFlags ? (
                    Object.entries(candidate.safetyFlags).map(([key, value]) => (
                      <span key={key} className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-gray-300">
                        {key}: {String(value)}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">Comment</p>
                <p className="text-sm text-white">{candidate.optionalComment ?? 'Yorum yok.'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
