'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiPackage, FiCheckCircle, FiAlertCircle, FiCpu } from 'react-icons/fi';
import {
  fetchModelLibraryList,
  discoverModelLibrary,
  dryRunRemoveModel,
  fetchModelPreferences,
  type LocalModelMetadata,
  type ModelLibraryListResponse,
  type ModelLibraryActionResult,
  type DefaultModelPreferencesUi,
  type DefaultModelCapabilityUi,
} from '@/lib/model-library-client';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function shortPath(p?: string): string {
  if (!p) return '—';
  const parts = p.replace(/\\/g, '/').split('/');
  return parts.length > 3 ? `…/${parts.slice(-2).join('/')}` : p;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'text-emerald-400',
  missing: 'text-red-400',
  installing: 'text-amber-400',
  failed: 'text-red-500',
  disabled: 'text-zinc-400',
};

const CAPABILITY_LABELS: Record<DefaultModelCapabilityUi, string> = {
  text: 'Metin',
  code: 'Kod',
  image: 'Görsel',
  vision: 'Vision',
  embedding: 'Embedding',
};

const CAPABILITY_FIELD_MAP: Record<DefaultModelCapabilityUi, keyof DefaultModelPreferencesUi> = {
  text: 'textModelId',
  code: 'codeModelId',
  image: 'imageModelId',
  vision: 'visionModelId',
  embedding: 'embeddingModelId',
};

// ── Sub-components ────────────────────────────────────────────────────────

function SummaryBar({ list }: { list: ModelLibraryListResponse }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/40 p-3 text-center">
        <p className="text-2xl font-bold text-white">{list.total}</p>
        <p className="text-xs text-zinc-400 mt-0.5">Toplam Model</p>
      </div>
      <div className="rounded-lg bg-emerald-950/30 border border-emerald-700/25 p-3 text-center">
        <p className="text-2xl font-bold text-emerald-400">{list.available}</p>
        <p className="text-xs text-zinc-400 mt-0.5">Mevcut</p>
      </div>
      <div className="rounded-lg bg-red-950/20 border border-red-700/20 p-3 text-center">
        <p className="text-2xl font-bold text-red-400">{list.missing}</p>
        <p className="text-xs text-zinc-400 mt-0.5">Eksik</p>
      </div>
    </div>
  );
}

interface ActionFeedbackProps {
  result: ModelLibraryActionResult | null;
  onClose: () => void;
}

function ActionFeedback({ result, onClose }: ActionFeedbackProps) {
  if (!result) return null;
  const isOk = result.ok;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm mb-4 ${
        isOk
          ? 'bg-emerald-950/30 border-emerald-700/30 text-emerald-300'
          : 'bg-red-950/20 border-red-700/25 text-red-300'
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {isOk ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
      </span>
      <span className="flex-1">{result.message}</span>
      {result.dryRun && (
        <span className="shrink-0 text-xs text-zinc-400 italic">Simülasyon — dosya silinmedi</span>
      )}
      <button onClick={onClose} className="shrink-0 text-zinc-500 hover:text-zinc-300 ml-1 text-xs">✕</button>
    </div>
  );
}

// ── Default model preferences card ───────────────────────────────────────

interface DefaultModelPreferencesCardProps {
  preferences: DefaultModelPreferencesUi | null;
  models: LocalModelMetadata[];
  loading: boolean;
}

function DefaultModelPreferencesCard({ preferences, models, loading }: DefaultModelPreferencesCardProps) {
  const modelById = new Map(models.map(m => [m.id, m]));

  return (
    <div className="rounded-lg border border-zinc-700/40 bg-zinc-800/30 p-4 mb-5">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-3">
        Varsayılan Modeller
      </h3>
      {loading ? (
        <p className="text-xs text-zinc-500">Tercihler yükleniyor…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(Object.keys(CAPABILITY_LABELS) as DefaultModelCapabilityUi[]).map(cap => {
            const field = CAPABILITY_FIELD_MAP[cap];
            const modelId = preferences?.[field] as string | undefined;
            const matched = modelId ? modelById.get(modelId) : undefined;
            const notInList = modelId && !matched;

            return (
              <div
                key={cap}
                className="rounded-md border border-zinc-700/30 bg-zinc-900/50 px-3 py-2 flex flex-col gap-0.5"
              >
                <span className="text-xs font-medium text-zinc-400">{CAPABILITY_LABELS[cap]}</span>
                {modelId ? (
                  <>
                    <span className="text-xs text-white truncate" title={modelId}>{modelId}</span>
                    {matched ? (
                      <span className="text-xs text-zinc-500">
                        {matched.provider} · {matched.runtime} ·{' '}
                        <span className={STATUS_COLORS[matched.status] ?? 'text-zinc-400'}>
                          {matched.status}
                        </span>
                      </span>
                    ) : notInList ? (
                      <span className="text-xs text-amber-400">Model listesinde bulunamadı</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-xs text-zinc-600 italic">Seçilmedi</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {preferences?.updatedAt && !loading && (
        <p className="text-xs text-zinc-600 mt-2">
          Son güncelleme: {new Date(preferences.updatedAt).toLocaleString('tr-TR')} · Kaynak: {preferences.source}
        </p>
      )}
    </div>
  );
}

// ── Model row ─────────────────────────────────────────────────────────────

interface ModelRowProps {
  model: LocalModelMetadata;
  onRemoveSimulate: (id: string) => void;
  busy: boolean;
}

function ModelRow({ model, onRemoveSimulate, busy }: ModelRowProps) {
  return (
    <tr className="border-b border-zinc-700/30 hover:bg-zinc-800/30 transition-colors">
      <td className="py-2 px-3 text-sm font-medium text-white max-w-[160px] truncate">
        {model.name}
      </td>
      <td className="py-2 px-3 text-xs text-zinc-400 capitalize">{model.provider}</td>
      <td className="py-2 px-3 text-xs text-zinc-400 capitalize">{model.runtime}</td>
      <td className={`py-2 px-3 text-xs capitalize font-medium ${STATUS_COLORS[model.status] ?? 'text-zinc-400'}`}>
        {model.status}
      </td>
      <td className="py-2 px-3 text-xs text-zinc-500">
        {model.capabilities.join(', ') || '—'}
      </td>
      <td className="py-2 px-3 text-xs text-zinc-500">{formatBytes(model.sizeBytes)}</td>
      <td className="py-2 px-3 text-xs text-zinc-600 max-w-[140px] truncate" title={model.localPath}>
        {shortPath(model.localPath ?? model.fileName)}
      </td>
      <td className="py-2 px-3 text-right">
        <button
          disabled={busy}
          onClick={() => onRemoveSimulate(model.id)}
          className="text-xs text-zinc-500 hover:text-red-400 disabled:opacity-40 transition-colors"
          title="Kaldırmayı simüle et (gerçek silme yok)"
        >
          Simüle Et
        </button>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function ModelLibraryPanel() {
  const [list, setList] = useState<ModelLibraryListResponse>({
    models: [], total: 0, available: 0, missing: 0,
  });
  const [preferences, setPreferences] = useState<DefaultModelPreferencesUi | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState<ModelLibraryActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchModelLibraryList();
      setList(data);
    } catch {
      setError('Model listesi alınamadı.');
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const data = await fetchModelPreferences();
      setPreferences(data);
    } catch {
      // silent — preferences card shows empty state
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadList(), loadPreferences()]).finally(() => setLoading(false));
  }, [loadList, loadPreferences]);

  const handleDiscover = async () => {
    setDiscovering(true);
    setActionResult(null);
    try {
      const data = await discoverModelLibrary();
      setList(data);
    } catch {
      setError('Tarama sırasında hata oluştu.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleRemoveSimulate = async (modelId: string) => {
    setActionBusy(true);
    setActionResult(null);
    const result = await dryRunRemoveModel(modelId);
    setActionResult(result);
    setActionBusy(false);
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiPackage className="text-indigo-400" size={18} />
          <h2 className="text-base font-semibold text-white">Yerel Model Kütüphanesi</h2>
        </div>
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/50 text-zinc-300 disabled:opacity-40 transition-colors"
        >
          <FiRefreshCw size={12} className={discovering ? 'animate-spin' : ''} />
          {discovering ? 'Taranıyor…' : 'Yeniden Tara'}
        </button>
      </div>

      {/* Action feedback */}
      <ActionFeedback result={actionResult} onClose={() => setActionResult(null)} />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-700/30 bg-red-950/20 px-3 py-2 text-sm text-red-300 mb-4">
          <FiAlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Summary */}
      {!loading && <SummaryBar list={list} />}

      {/* Default model preferences */}
      <DefaultModelPreferencesCard
        preferences={preferences}
        models={list.models}
        loading={prefsLoading}
      />

      {/* Table */}
      {loading ? (
        <p className="text-sm text-zinc-500 py-6 text-center">Yükleniyor…</p>
      ) : list.models.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-zinc-500">
          <FiCpu size={28} />
          <p className="text-sm">Henüz yerel model bulunamadı.</p>
          <p className="text-xs text-zinc-600">Yerel model dosyaları yoksa bu liste boş kalabilir.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-700/40">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-700/40 bg-zinc-800/50">
                {['Ad', 'Provider', 'Runtime', 'Durum', 'Kapasite', 'Boyut', 'Konum', ''].map(h => (
                  <th key={h} className="py-2 px-3 text-xs font-medium text-zinc-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.models.map(model => (
                <ModelRow
                  key={model.id}
                  model={model}
                  onRemoveSimulate={handleRemoveSimulate}
                  busy={actionBusy}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-zinc-600 pt-2">
        "Simüle Et" işlemi dosyaları silmez; sadece kaldırma akışını test eder.
      </p>
    </div>
  );
}
