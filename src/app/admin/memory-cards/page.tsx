'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemoryCard } from '@core/memory-cards/types';
import StatusBadge from '@components/ui/StatusBadge';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';

const STATUS_OPTIONS: Array<{ value: MemoryCard['status'] | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'archived', label: 'Arşivlendi' },
];

const RISK_OPTIONS: Array<{ value: MemoryCard['riskLevel'] | 'all'; label: string }> = [
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

const STATUS_LABELS: Record<MemoryCard['status'], string> = {
  active: 'Aktif',
  archived: 'Arşivlendi',
};

const RISK_LABELS: Record<MemoryCard['riskLevel'], string> = {
  low: 'Düşük Risk',
  medium: 'Orta Risk',
  high: 'Yüksek Risk',
};

const statusToVariant = (status: MemoryCard['status']) => {
  switch (status) {
    case 'active': return 'active' as const;
    case 'archived': return 'cancelled' as const;
  }
};

const riskToVariant = (risk: MemoryCard['riskLevel']) => {
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

export default function AdminMemoryCardsPage() {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [filterStatus, setFilterStatus] = useState<MemoryCard['status'] | 'all'>('all');
  const [filterRisk, setFilterRisk] = useState<MemoryCard['riskLevel'] | 'all'>('all');
  const [filterMode, setFilterMode] = useState<string | 'all'>('all');
  const [filterScope, setFilterScope] = useState<string | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string | 'all'>('all');
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
    loadCards();
  }, []);

  const loadCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch('/api/memory-cards');
      if (response.status === 401) { router.push('/admin/login'); return; }
      if (!response.ok) throw new Error('MemoryCard kayıtları alınamadı.');
      const result = await response.json();
      if (!result?.success || !Array.isArray(result.cards)) throw new Error('MemoryCard verisi geçersiz.');
      setCards(result.cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MemoryCard yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    setActionMessage(null);
    setUpdatingId(id);
    try {
      const response = await adminFetch('/api/memory-cards', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: 'archived' }),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Kayıt arşivlenemedi.');
      }
      setCards((current) => current.map((card) => (card.id === id ? result.card : card)));
      setActionMessage('Kayıt başarıyla arşivlendi.');
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Arşivleme sırasında hata oluştu.');
    } finally {
      setUpdatingId(null);
    }
  };

  const availableScopes = useMemo(() => {
    const scopes = new Set<string>();
    cards.forEach((card) => { if (card.memoryScope) scopes.add(card.memoryScope); });
    return Array.from(scopes).sort();
  }, [cards]);

  const availableProjects = useMemo(() => {
    const projects = new Set<string>();
    cards.forEach((card) => { if (card.projectId) projects.add(card.projectId); });
    return Array.from(projects).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    return [...cards]
      .filter((card) => filterStatus === 'all' || card.status === filterStatus)
      .filter((card) => filterRisk === 'all' || card.riskLevel === filterRisk)
      .filter((card) => filterMode === 'all' || card.mode === filterMode)
      .filter((card) => filterScope === 'all' || card.memoryScope === filterScope)
      .filter((card) => filterProject === 'all' || card.projectId === filterProject)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cards, filterStatus, filterRisk, filterMode, filterScope, filterProject]);

  if (!authorized) return null;

  return (
    <div className="theme-admin-page min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-gray-500 mb-3">Admin · Learning Pipeline</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Hafıza Kartları</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">MemoryCard kayıtlarını projectId, memoryScope ve risk düzeyiyle görüntüleyin. Global, project ve session hafızaları birbirinden ayrı değerlendirilir.</p>
        </div>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <ScopeNote title="Global Memory" body="Ortak bağlam yalnızca açıkça seçilirse kullanılır." />
        <ScopeNote title="Project Memory" body="BOSS AI hafızası Doomsgame Engine isteklerine otomatik karışmaz." />
        <ScopeNote title="Session Memory" body="Geçici bağlam uzun dönem hafızadan ayrı tutulur." />
      </section>

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/10 p-5">
        <h2 className="text-sm font-black text-white mb-4">Persistence Strategy (Phase 5 Foundation)</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Store</p>
            <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">File-store Adapter</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Short-term Goal</p>
            <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">JSONL / File-store</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Mid-term Goal</p>
            <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-gray-300">SQLite / Embedded Store</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Data Guard</p>
            <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">Sensitive Guard Active</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-3">Not: In-memory store kalıcı değildir, restart atıldığında sıfırlanır. Kalıcı dosya yazma beta sonrası planlanmıştır.</p>
      </div>

      {/* Pipeline flow */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Feedback</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Learning Candidate</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Distillation Preview</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-gray-400">Memory Write Queue</span>
        <span className="text-gray-500">→</span>
        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-emerald-200 font-black">Memory Card</span>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-6">
        <FilterSelect label="Status" value={filterStatus} onChange={(value) => setFilterStatus(value as MemoryCard['status'] | 'all')} options={STATUS_OPTIONS} />
        <FilterSelect label="Risk" value={filterRisk} onChange={(value) => setFilterRisk(value as MemoryCard['riskLevel'] | 'all')} options={RISK_OPTIONS} />
        <FilterSelect label="Mode" value={filterMode} onChange={(value) => setFilterMode(value)} options={MODE_OPTIONS} />
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Memory Scope</p>
          <select value={filterScope} onChange={(event) => setFilterScope(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">
            <option value="all">Tümü</option>
            {availableScopes.map((scope) => (<option key={scope} value={scope}>{scope}</option>))}
          </select>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">Project</p>
          <select value={filterProject} onChange={(event) => setFilterProject(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">
            <option value="all">Tümü</option>
            {availableProjects.map((project) => (<option key={project} value={project}>{project}</option>))}
          </select>
        </div>
      </div>

      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100 mb-6">{error}</div> : null}
      {actionMessage ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 mb-6">{actionMessage}</div> : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Henüz hafıza kartı yok.</div>
      ) : (
        <div className="space-y-6">
          {filteredCards.map((card) => (
            <div key={card.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <StatusBadge variant={statusToVariant(card.status)} label={STATUS_LABELS[card.status]} />
                    <StatusBadge variant={riskToVariant(card.riskLevel)} label={RISK_LABELS[card.riskLevel]} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{card.title}</h2>
                  <p className="text-sm text-gray-400 dark:text-gray-300 max-w-3xl">{card.summary}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {card.status === 'active' ? (
                    <button
                      type="button"
                      disabled={updatingId === card.id}
                      onClick={() => handleArchive(card.id)}
                      className="rounded-2xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Arşivle
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                <Card label="ID" value={card.id} />
                <Card label="Queue ID" value={card.sourceQueueId} />
                <Card label="Preview ID" value={card.sourcePreviewId} />
                <Card label="Candidate ID" value={card.sourceCandidateId} />
                <Card label="Feedback ID" value={card.sourceFeedbackId} />
                <Card label="Memory Scope" value={card.memoryScope} />
                <Card label="Mode" value={card.mode} />
                <Card label="Project" value={card.projectId ?? 'aillame-local'} />
                <Card label="Keywords" value={card.keywords.join(', ')} />
                <Card label="Confidence" value={card.confidenceScore.toString()} />
                <Card label="Created At" value={formatTimestamp(card.createdAt)} />
                <Card label="Updated At" value={formatTimestamp(card.updatedAt)} />
                {card.archivedAt ? <Card label="Archived At" value={formatTimestamp(card.archivedAt)} /> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-3">{label}</p>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
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

function ScopeNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs text-gray-400 leading-relaxed">{body}</p>
    </div>
  );
}
