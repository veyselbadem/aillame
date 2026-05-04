'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  DistillationPreview,
  DistillationPreviewRiskLevel,
  DistillationPreviewStatus,
} from '@core/distillation-preview/types';
import StatusBadge from '@components/ui/StatusBadge';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';

const STATUS_OPTIONS: Array<{ value: DistillationPreviewStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'approved_for_memory', label: 'Hafıza İçin Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'archived', label: 'Arşivlendi' },
];

const TYPE_OPTIONS: Array<{ value: DistillationPreview['candidateType'] | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'positive_learning_candidate', label: 'Pozitif Öğrenme' },
  { value: 'improvement_candidate', label: 'İyileştirme' },
];

const RISK_OPTIONS: Array<{ value: DistillationPreviewRiskLevel | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'low', label: 'Düşük Risk' },
  { value: 'medium', label: 'Orta Risk' },
  { value: 'high', label: 'Yüksek Risk' },
];

const MODE_OPTIONS: Array<{ value: string | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'general', label: 'General' },
  { value: 'education', label: 'Education' },
  { value: 'code', label: 'Code' },
  { value: 'economy', label: 'Economy' },
];

const STATUS_LABELS: Record<DistillationPreviewStatus, string> = {
  draft: 'Taslak',
  approved_for_memory: 'Hafıza İçin Onaylandı',
  rejected: 'Reddedildi',
  archived: 'Arşivlendi',
};

const RISK_LABELS: Record<DistillationPreviewRiskLevel, string> = {
  low: 'Düşük Risk',
  medium: 'Orta Risk',
  high: 'Yüksek Risk',
};

const statusToVariant = (status: DistillationPreviewStatus) => {
  switch (status) {
    case 'draft': return 'pending' as const;
    case 'approved_for_memory': return 'active' as const;
    case 'rejected': return 'failed' as const;
    case 'archived': return 'cancelled' as const;
  }
};

const riskToVariant = (risk: DistillationPreviewRiskLevel) => {
  switch (risk) {
    case 'low': return 'active' as const;
    case 'medium': return 'warning' as const;
    case 'high': return 'failed' as const;
  }
};

const formatTimestamp = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function AdminDistillationPreviewPage() {
  const [previews, setPreviews] = useState<DistillationPreview[]>([]);
  const [filterStatus, setFilterStatus] = useState<DistillationPreviewStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<DistillationPreview['candidateType'] | 'all'>('all');
  const [filterRisk, setFilterRisk] = useState<DistillationPreviewRiskLevel | 'all'>('all');
  const [filterMode, setFilterMode] = useState<string | 'all'>('all');
  const [filterIntent, setFilterIntent] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = requireAdminTokenOrRedirect(router);
    if (!token) return;
    setAuthorized(true);
    loadPreviews();
  }, []);

  const loadPreviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetch('/api/distillation-preview');
      if (response.status === 401) { router.push('/admin/login'); return; }
      if (!response.ok) {
        throw new Error('Damıtma önizleme kayıtları alınamadı.');
      }

      const result = await response.json();
      if (!result?.success || !Array.isArray(result.previews)) {
        throw new Error('Damıtma önizleme verisi geçersiz.');
      }

      setPreviews(result.previews);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Damıtma önizlemesi yüklenirken hata oluştu.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: DistillationPreviewStatus) => {
    setActionMessage(null);
    setUpdatingId(id);

    try {
      const response = await adminFetch('/api/distillation-preview', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Durum güncellenemedi.');
      }

      setPreviews((current) =>
        current.map((preview) => (preview.id === id ? result.preview : preview))
      );
      setActionMessage('Durum başarıyla güncellendi.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Durum güncellenirken hata oluştu.';
      setActionMessage(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQueuePreview = async (previewId: string) => {
    setActionMessage(null);
    setUpdatingId(previewId);

    try {
      const response = await adminFetch('/api/memory-write-queue', {
        method: 'POST',
        body: JSON.stringify({ previewId }),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Yazım kuyruğuna alınamadı.');
      }

      setActionMessage('Preview yazım kuyruğuna alındı.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yazım kuyruğuna alınırken hata oluştu.';
      setActionMessage(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const availableIntents = useMemo(() => {
    const intents = new Set<string>();
    previews.forEach((preview) => {
      if (preview.intent) intents.add(preview.intent);
    });
    return Array.from(intents).sort();
  }, [previews]);

  const filteredPreviews = useMemo(() => {
    return [...previews]
      .filter((preview) => {
        if (filterStatus !== 'all' && preview.status !== filterStatus) return false;
        if (filterType !== 'all' && preview.candidateType !== filterType) return false;
        if (filterRisk !== 'all' && preview.riskLevel !== filterRisk) return false;
        if (filterMode !== 'all' && preview.primaryMode !== filterMode) return false;
        if (filterIntent !== 'all' && preview.intent !== filterIntent) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [previews, filterStatus, filterType, filterRisk, filterMode, filterIntent]);

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-gray-500 mb-3">Admin · Learning Pipeline</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Damıtma Önizlemeleri</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">Önizleme kayıtlarını görüntüleyin, filtreleyin ve status yönetimini yapın. Auto write kapalı; hafıza onayı için review gereklidir.</p>
        </div>
      </header>

      {/* Pipeline flow */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Feedback</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Learning Candidate</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-indigo-200 font-black">Distillation Preview</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Memory Write Queue</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Memory Card</span>
      </div>

      {/* Review required notice */}
      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
        <span className="text-amber-400 text-sm">⚠</span>
        <p className="text-xs text-amber-200"><span className="font-black">Review Required</span> · Auto memory write devre dışı. Onaylanan preview'lar yazım kuyruğuna alınana kadar hafizaya geçmez.</p>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Status</p>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as DistillationPreviewStatus | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Aday Türü</p>
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as DistillationPreview['candidateType'] | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Risk</p>
          <select
            value={filterRisk}
            onChange={(event) => setFilterRisk(event.target.value as DistillationPreviewRiskLevel | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {RISK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Mode</p>
          <select
            value={filterMode}
            onChange={(event) => setFilterMode(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Intent</p>
          <select
            value={filterIntent}
            onChange={(event) => setFilterIntent(event.target.value as string | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            <option value="all">Tümü</option>
            {availableIntents.map((intent) => (
              <option key={intent} value={intent}>{intent}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100 mb-6">{error}</div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 mb-6">{actionMessage}</div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : filteredPreviews.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Henüz damıtma önizlemesi yok.</div>
      ) : (
        <div className="space-y-6">
          {filteredPreviews.map((preview) => (
            <div key={preview.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <StatusBadge variant={statusToVariant(preview.status)} label={STATUS_LABELS[preview.status]} />
                    <StatusBadge variant={riskToVariant(preview.riskLevel)} label={RISK_LABELS[preview.riskLevel]} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{preview.proposedTitle}</h2>
                  <p className="text-sm text-gray-300 max-w-3xl">{preview.proposedSummary}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={updatingId === preview.id}
                    onClick={() => handleStatusChange(preview.id, 'approved_for_memory')}
                    className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hafızaya Onayla
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === preview.id}
                    onClick={() => handleStatusChange(preview.id, 'rejected')}
                    className="rounded-2xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reddet
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === preview.id}
                    onClick={() => handleStatusChange(preview.id, 'archived')}
                    className="rounded-2xl bg-slate-500/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Arşivle
                  </button>
                </div>
              </div>
              {preview.status === 'approved_for_memory' ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={updatingId === preview.id}
                    onClick={() => handleQueuePreview(preview.id)}
                    className="rounded-2xl bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Yazım Kuyruğuna Al
                  </button>
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                <Card label="Preview ID" value={preview.id} />
                <Card label="Candidate ID" value={preview.sourceCandidateId} />
                <Card label="Feedback ID" value={preview.sourceFeedbackId} />
                <Card label="Candidate Type" value={preview.candidateType} />
                <Card label="Primary Mode" value={preview.primaryMode ?? '—'} />
                <Card label="Selected Modes" value={preview.selectedModes?.join(', ') ?? '—'} />
                <Card label="Intent" value={preview.intent ?? '—'} />
                <Card label="Memory Scope" value={preview.proposedMemoryScope} />
                <Card label="Keywords" value={preview.proposedKeywords.join(', ')} />
                <Card label="Confidence" value={preview.confidenceScore.toString()} />
                <Card label="Created At" value={formatTimestamp(preview.createdAt)} />
                <Card label="Updated At" value={formatTimestamp(preview.updatedAt)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">{label}</p>
      <p className="text-sm text-white break-all">{value}</p>
    </div>
  );
}
