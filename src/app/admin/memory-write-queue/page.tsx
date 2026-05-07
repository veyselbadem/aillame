'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemoryWriteQueueRecord, MemoryWriteQueueStatus } from '@core/memory-write-queue/types';
import StatusBadge from '@components/ui/StatusBadge';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';

const STATUS_OPTIONS: Array<{ value: MemoryWriteQueueStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending_write', label: 'Yazım Bekliyor' },
  { value: 'ready_for_memory_write', label: 'Hafızaya Yazıma Hazır' },
  { value: 'written', label: 'Yazıldı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'archived', label: 'Arşivlendi' },
];

const RISK_OPTIONS: Array<{ value: MemoryWriteQueueRecord['riskLevel'] | 'all'; label: string }> = [
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
  { value: 'image_generation', label: 'Image Generation' },
];

const STATUS_LABELS: Record<MemoryWriteQueueStatus, string> = {
  pending_write: 'Yazım Bekliyor',
  ready_for_memory_write: 'Hafızaya Yazıma Hazır',
  written: 'Hafızaya Yazıldı',
  rejected: 'Reddedildi',
  archived: 'Arşivlendi',
};

const RISK_LABELS: Record<MemoryWriteQueueRecord['riskLevel'], string> = {
  low: 'Düşük Risk',
  medium: 'Orta Risk',
  high: 'Yüksek Risk',
};

const statusToVariant = (status: MemoryWriteQueueStatus) => {
  switch (status) {
    case 'pending_write': return 'pending' as const;
    case 'ready_for_memory_write': return 'running' as const;
    case 'written': return 'completed' as const;
    case 'rejected': return 'failed' as const;
    case 'archived': return 'cancelled' as const;
  }
};

const riskToVariant = (risk: MemoryWriteQueueRecord['riskLevel']) => {
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

export default function AdminMemoryWriteQueuePage() {
  const [records, setRecords] = useState<MemoryWriteQueueRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<MemoryWriteQueueStatus | 'all'>('all');
  const [filterRisk, setFilterRisk] = useState<MemoryWriteQueueRecord['riskLevel'] | 'all'>('all');
  const [filterMode, setFilterMode] = useState<string | 'all'>('all');
  const [filterScope, setFilterScope] = useState<string | 'all'>('all');
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
    loadQueueRecords();
  }, []);

  const loadQueueRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetch('/api/memory-write-queue');
      if (response.status === 401) { router.push('/admin/login'); return; }
      if (!response.ok) {
        throw new Error('Hafıza yazım kuyruğu kayıtları alınamadı.');
      }

      const result = await response.json();
      if (!result?.success || !Array.isArray(result.records)) {
        throw new Error('Hafıza yazım kuyruğu verisi geçersiz.');
      }

      setRecords(result.records);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hafıza yazım kuyruğu yüklenirken hata oluştu.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueStatusChange = async (id: string, status: MemoryWriteQueueStatus) => {
    setActionMessage(null);
    setUpdatingId(id);

    try {
      const response = await adminFetch('/api/memory-write-queue', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Kayıt güncellenemedi.');
      }

      setRecords((current) => current.map((record) => (record.id === id ? result.record : record)));
      setActionMessage('Kayıt durumu başarıyla güncellendi.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kayıt güncellenirken hata oluştu.';
      setActionMessage(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateMemoryCard = async (id: string) => {
    setActionMessage(null);
    setUpdatingId(id);

    try {
      const response = await adminFetch('/api/memory-cards', {
        method: 'POST',
        body: JSON.stringify({ queueId: id }),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'MemoryCard oluşturulamadı.');
      }

      setRecords((current) => current.map((record) => (record.id === id ? result.queueRecord : record)));
      setActionMessage('Gerçek hafızaya yazma işlemi başarılı oldu.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MemoryCard oluşturulurken hata oluştu.';
      setActionMessage(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const availableScopes = useMemo(() => {
    const scopes = new Set<string>();
    records.forEach((record) => {
      if (record.targetMemoryScope) scopes.add(record.targetMemoryScope);
    });
    return Array.from(scopes).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return [...records]
      .filter((record) => {
        if (filterStatus !== 'all' && record.status !== filterStatus) return false;
        if (filterRisk !== 'all' && record.riskLevel !== filterRisk) return false;
        if (filterMode !== 'all' && record.targetMode !== filterMode) return false;
        if (filterScope !== 'all' && record.targetMemoryScope !== filterScope) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [records, filterStatus, filterRisk, filterMode, filterScope]);

  if (!authorized) return null;

  return (
    <div className="theme-admin-page min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-gray-500 mb-3">Admin · Learning Pipeline</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Hafıza Yazım Kuyruğu</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">Queue kayıtlarını görüntüleyin, filtreleyin ve status yönetimini yapın. Auto write kapalı; hafıza yazımı manuel onay gerektirir.</p>
        </div>
      </header>

      {/* Pipeline flow */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Feedback</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Learning Candidate</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Distillation Preview</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-indigo-200 font-black">Memory Write Queue</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Memory Card</span>
      </div>

      {/* Review required notice */}
      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
        <span className="text-amber-400 text-sm">⚠</span>
        <p className="text-xs text-amber-200"><span className="font-black">Review Required</span> · Hafızaya gerçek yazım işlemi otomatik değildir. Her kayıt için “Gerçek Hafızaya Yaz” butonuna tıklanması gerekir.</p>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Status</p>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as MemoryWriteQueueStatus | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Risk</p>
          <select
            value={filterRisk}
            onChange={(event) => setFilterRisk(event.target.value as MemoryWriteQueueRecord['riskLevel'] | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {RISK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Target Mode</p>
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
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Memory Scope</p>
          <select
            value={filterScope}
            onChange={(event) => setFilterScope(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            <option value="all">Tümü</option>
            {availableScopes.map((scope) => (
              <option key={scope} value={scope}>{scope}</option>
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
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Henüz hafıza yazım kuyruğu kaydı yok.</div>
      ) : (
        <div className="space-y-6">
          {filteredRecords.map((record) => (
            <div key={record.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <StatusBadge variant={statusToVariant(record.status)} label={STATUS_LABELS[record.status]} />
                    <StatusBadge variant={riskToVariant(record.riskLevel)} label={RISK_LABELS[record.riskLevel]} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{record.title}</h2>
                  <p className="text-sm text-gray-400 dark:text-gray-300 max-w-3xl">{record.summary}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {record.status === 'pending_write' ? (
                    <button
                      type="button"
                      disabled={updatingId === record.id}
                      onClick={() => handleQueueStatusChange(record.id, 'ready_for_memory_write')}
                      className="rounded-2xl bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Yazıma Hazırla
                    </button>
                  ) : null}

                  {record.status === 'ready_for_memory_write' ? (
                    <button
                      type="button"
                      disabled={updatingId === record.id}
                      onClick={() => handleCreateMemoryCard(record.id)}
                      className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Gerçek Hafızaya Yaz
                    </button>
                  ) : null}

                  {record.status !== 'written' && record.status !== 'archived' ? (
                    <button
                      type="button"
                      disabled={updatingId === record.id}
                      onClick={() => handleQueueStatusChange(record.id, 'rejected')}
                      className="rounded-2xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reddet
                    </button>
                  ) : null}

                  {record.status !== 'written' && record.status !== 'archived' ? (
                    <button
                      type="button"
                      disabled={updatingId === record.id}
                      onClick={() => handleQueueStatusChange(record.id, 'archived')}
                      className="rounded-2xl bg-slate-500/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Arşivle
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                <Card label="Queue ID" value={record.id} />
                <Card label="Preview ID" value={record.sourcePreviewId} />
                <Card label="Candidate ID" value={record.sourceCandidateId} />
                <Card label="Feedback ID" value={record.sourceFeedbackId} />
                <Card label="Memory Scope" value={record.targetMemoryScope} />
                <Card label="Target Mode" value={record.targetMode} />
                <Card label="Keywords" value={record.keywords.join(', ')} />
                <Card label="Confidence" value={record.confidenceScore.toString()} />
                <Card label="Created At" value={formatTimestamp(record.createdAt)} />
                <Card label="Updated At" value={formatTimestamp(record.updatedAt)} />
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
