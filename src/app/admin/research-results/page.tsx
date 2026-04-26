'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExternalApiMode } from '@core/external-api/types';
import type {
  ResearchResultRecord,
  ResearchResultSafetyFlags,
  ResearchResultStatus,
  ResearchResultType,
} from '@core/research-results/types';

const STATUS_OPTIONS: Array<{ value: ResearchResultStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'reviewed', label: 'İncelendi' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'archived', label: 'Arşivlendi' },
];

const RESEARCH_TYPE_OPTIONS: Array<{ value: ResearchResultType | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'web', label: 'Web Araştırması' },
  { value: 'news', label: 'Haber' },
  { value: 'economy_news', label: 'Ekonomi Haberi' },
  { value: 'documentation', label: 'Dokümantasyon' },
  { value: 'education', label: 'Eğitim' },
  { value: 'source_summary', label: 'Kaynak Özeti' },
];

const PROJECT_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'boss-ai', label: 'boss-ai' },
  { value: 'doomsgame-engine', label: 'doomsgame-engine' },
  { value: 'egitim-web', label: 'egitim-web' },
  { value: 'aillame-local', label: 'aillame-local' },
];

const MODE_OPTIONS: Array<{ value: ExternalApiMode | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'general', label: 'general' },
  { value: 'code', label: 'code' },
  { value: 'education', label: 'education' },
  { value: 'economy', label: 'economy' },
  { value: 'image_generation', label: 'image_generation' },
];

const SAFETY_FLAG_OPTIONS: Array<{ value: keyof ResearchResultSafetyFlags; label: string }> = [
  { value: 'requiresCitation', label: 'Kaynak Gerekli' },
  { value: 'requiresFreshnessCheck', label: 'Güncellik Kontrolü Gerekli' },
  { value: 'requiresFinancialDisclaimer', label: 'Finansal Uyarı Gerekli' },
  { value: 'sourceReliabilityUnknown', label: 'Kaynak Güvenilirliği Bilinmiyor' },
  { value: 'shouldNotWriteDirectlyToMemory', label: 'Doğrudan Hafızaya Yazılmamalı' },
];

const STATUS_LABELS: Record<ResearchResultStatus, string> = {
  draft: 'Taslak',
  reviewed: 'İncelendi',
  rejected: 'Reddedildi',
  archived: 'Arşivlendi',
};

const RESEARCH_TYPE_LABELS: Record<ResearchResultType, string> = {
  web: 'Web Araştırması',
  news: 'Haber',
  economy_news: 'Ekonomi Haberi',
  documentation: 'Dokümantasyon',
  education: 'Eğitim',
  source_summary: 'Kaynak Özeti',
};

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatSafeText = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
};

export default function AdminResearchResultsPage() {
  const [results, setResults] = useState<ResearchResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ResearchResultStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ResearchResultType | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [modeFilter, setModeFilter] = useState<ExternalApiMode | 'all'>('all');
  const [safetyFilter, setSafetyFilter] = useState<keyof ResearchResultSafetyFlags | 'all'>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/research-results');
      if (!response.ok) {
        throw new Error('Araştırma sonuçları yüklenemedi.');
      }
      const body = await response.json();
      if (!body?.success || !Array.isArray(body.results)) {
        throw new Error('Geçersiz veri alındı.');
      }
      setResults(body.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Araştırma sonuçları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ResearchResultStatus) => {
    setActionError(null);
    setActionLoading(id);
    try {
      const response = await fetch('/api/research-results', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const body = await response.json();
      if (!response.ok || !body?.success || !body?.result) {
        throw new Error(body?.error || 'Durum güncellemesi başarısız oldu.');
      }

      setResults((current) =>
        current.map((item) => (item.id === id ? body.result : item))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Durum güncellemesi sırasında hata oluştu.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredResults = useMemo(() => {
    return [...results]
      .filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (typeFilter !== 'all' && item.researchType !== typeFilter) return false;
        if (projectFilter !== 'all' && item.projectId !== projectFilter) return false;
        if (modeFilter !== 'all' && item.mode !== modeFilter) return false;
        if (safetyFilter !== 'all' && !item.safetyFlags[safetyFilter]) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [results, statusFilter, typeFilter, projectFilter, modeFilter, safetyFilter]);

  return (
    <div className="min-h-screen relative p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-gray-500 mb-3">Admin Research Results</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Araştırma Sonuçları</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">Research result kayıtlarını okuyun, filtreleyin ve durum güncellemesi yapın. Bu sayfa sadece görüntüleme ve yönetim amaçlıdır.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadResults}
            className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:border-indigo-400 hover:text-indigo-300 transition"
          >
            Yenile
          </button>
        </div>
      </header>

      <div className="grid gap-4 mb-6 md:grid-cols-2 xl:grid-cols-3">
        <FilterCard label="Durum" htmlFor="status-filter">
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ResearchResultStatus | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterCard>
        <FilterCard label="Araştırma Türü" htmlFor="type-filter">
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ResearchResultType | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {RESEARCH_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterCard>
        <FilterCard label="Proje" htmlFor="project-filter">
          <select
            id="project-filter"
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {PROJECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterCard>
        <FilterCard label="Mod" htmlFor="mode-filter">
          <select
            id="mode-filter"
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as ExternalApiMode | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterCard>
        <FilterCard label="Güvenlik Bayrağı" htmlFor="safety-filter">
          <select
            id="safety-filter"
            value={safetyFilter}
            onChange={(event) => setSafetyFilter(event.target.value as keyof ResearchResultSafetyFlags | 'all')}
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white"
          >
            <option value="all">Tümü</option>
            {SAFETY_FLAG_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterCard>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100 mb-6">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : filteredResults.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Henüz araştırma sonucu yok.</div>
      ) : (
        <div className="space-y-6">
          {filteredResults.map((item) => (
            <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-indigo-200">{item.projectId}</span>
                    <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-slate-200">{item.mode}</span>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-emerald-200">{RESEARCH_TYPE_LABELS[item.researchType]}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-gray-300">{STATUS_LABELS[item.status]}</span>
                  </div>
                  <p className="text-sm text-gray-300 break-words"><span className="font-semibold text-white">Sorgu:</span> {item.query}</p>
                  <p className="text-xs text-gray-500">ID: {item.id}</p>
                </div>
                <div className="text-right text-xs text-gray-400 space-y-1">
                  <div>Oluşturuldu: {formatTimestamp(item.createdAt)}</div>
                  <div>Güncellendi: {formatTimestamp(item.updatedAt)}</div>
                  <div>İncelendi: {item.reviewedAt ? formatTimestamp(item.reviewedAt) : '—'}</div>
                  <div>Arşivlendi: {item.archivedAt ? formatTimestamp(item.archivedAt) : '—'}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <DetailBlock title="Normalized Task">
                  <pre className="whitespace-pre-wrap break-words text-sm text-gray-200">{item.normalizedTask ? JSON.stringify(item.normalizedTask, null, 2) : '—'}</pre>
                </DetailBlock>
                <DetailBlock title="Safety Flags">
                  <div className="flex flex-wrap gap-2">
                    {SAFETY_FLAG_OPTIONS.map((flag) => (
                      <span
                        key={flag.value}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${item.safetyFlags[flag.value] ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/5 text-gray-400'}`}
                      >
                        {flag.label}
                      </span>
                    ))}
                  </div>
                </DetailBlock>
                <DetailBlock title="Özet">
                  <p className="text-sm text-gray-200 break-words">{item.summary ? item.summary : '—'}</p>
                </DetailBlock>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <h2 className="text-sm font-black uppercase tracking-[0.28em] text-gray-400">Sources</h2>
                    <span className="text-xs text-gray-500">{item.sources.length} kaynağı</span>
                  </div>
                  {item.sources.length === 0 ? (
                    <p className="text-sm text-gray-400">Kaynak bilgisi yok.</p>
                  ) : (
                    <div className="space-y-4">
                      {item.sources.map((source, index) => (
                        <div key={`${item.id}-source-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <ValueRow label="Title" value={formatSafeText(source.title)} />
                            <ValueRow label="URL" value={formatSafeText(source.url)} />
                            <ValueRow label="Snippet" value={formatSafeText(source.snippet)} />
                            <ValueRow label="Source Name" value={formatSafeText(source.sourceName)} />
                            <ValueRow label="Published At" value={source.publishedAt ? formatTimestamp(source.publishedAt) : '—'} />
                            <ValueRow label="Accessed At" value={formatTimestamp(source.accessedAt)} />
                            <ValueRow label="Reliability Score" value={source.reliabilityScore !== undefined ? String(source.reliabilityScore) : '—'} />
                            <ValueRow label="Citation Text" value={formatSafeText(source.citationText)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {actionError && actionLoading === item.id ? (
                <div className="mt-4 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{actionError}</div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={actionLoading === item.id || item.status === 'reviewed'}
                  onClick={() => updateStatus(item.id, 'reviewed')}
                  className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  İncelendi Olarak İşaretle
                </button>
                <button
                  type="button"
                  disabled={actionLoading === item.id || item.status === 'rejected'}
                  onClick={() => updateStatus(item.id, 'rejected')}
                  className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reddet
                </button>
                <button
                  type="button"
                  disabled={actionLoading === item.id || item.status === 'archived'}
                  onClick={() => updateStatus(item.id, 'archived')}
                  className="rounded-2xl bg-slate-500/10 border border-slate-500/20 px-4 py-3 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Arşivle
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterCard({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">{label}</p>
      {children}
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">{title}</p>
      {children}
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{label}</p>
      <p className="text-sm text-gray-200 break-words">{value}</p>
    </div>
  );
}
