'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiPackage, FiCheckCircle, FiAlertCircle, FiCpu } from 'react-icons/fi';
import {
  fetchModelLibraryList,
  discoverModelLibrary,
  dryRunRemoveModel,
  removeModel,
  fetchModelPreferences,
  updateModelPreference,
  clearModelPreference,
  type LocalModelMetadata,
  type ModelLibraryListResponse,
  type ModelLibraryActionResult,
  type DefaultModelPreferencesUi,
  type DefaultModelCapabilityUi,
} from '@/lib/model-library-client';
import { safeConfirm } from '@/lib/confirm';

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
  available: 'text-emerald-500 dark:text-emerald-400',
  missing: 'text-rose-500 dark:text-rose-400',
  installing: 'text-amber-500 dark:text-amber-400',
  failed: 'text-rose-600 dark:text-rose-500',
  disabled: 'var(--text-muted)',
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
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="theme-elevated rounded-2xl p-4 text-center">
        <p className="text-3xl font-black theme-title">{list.total}</p>
        <p className="text-[10px] theme-muted uppercase tracking-widest mt-1">Total Models</p>
      </div>
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center">
        <p className="text-3xl font-black text-emerald-500">{list.available}</p>
        <p className="text-[10px] theme-muted uppercase tracking-widest mt-1">Available</p>
      </div>
      <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 text-center">
        <p className="text-3xl font-black text-rose-500">{list.missing}</p>
        <p className="text-[10px] theme-muted uppercase tracking-widest mt-1">Missing</p>
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
  prefBusy: ReadonlySet<DefaultModelCapabilityUi>;
  onClear: (cap: DefaultModelCapabilityUi) => void;
}

function DefaultModelPreferencesCard({ preferences, models, loading, prefBusy, onClear }: DefaultModelPreferencesCardProps) {
  const modelById = new Map(models.map(m => [m.id, m]));

  return (
    <div className="theme-elevated rounded-2xl p-6 mb-8">
      <h3 className="text-[10px] font-black theme-muted uppercase tracking-[0.2em] mb-4">
        Default Model Mapping
      </h3>
      {loading ? (
        <p className="text-xs theme-muted">Loading preferences…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {(Object.keys(CAPABILITY_LABELS) as DefaultModelCapabilityUi[]).map(cap => {
            const field = CAPABILITY_FIELD_MAP[cap];
            const modelId = preferences?.[field] as string | undefined;
            const matched = modelId ? modelById.get(modelId) : undefined;
            const busy = prefBusy.has(cap);

            return (
              <div
                key={cap}
                className="theme-surface rounded-xl px-4 py-3 border-transparent hover:border-indigo-500/30 transition-all flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black theme-muted uppercase tracking-widest">{CAPABILITY_LABELS[cap]}</span>
                  {modelId && (
                    <button
                      disabled={busy}
                      onClick={() => onClear(cap)}
                      className="text-[9px] font-bold text-rose-500 hover:text-rose-400 disabled:opacity-40 transition-colors uppercase"
                    >
                      {busy ? '…' : 'Clear'}
                    </button>
                  )}
                </div>
                {modelId ? (
                  <div className="min-w-0">
                    <p className="text-xs font-bold theme-title truncate" title={modelId}>{modelId}</p>
                    {matched ? (
                      <p className="text-[9px] theme-muted uppercase font-bold mt-0.5">
                        {matched.provider} · <span className={STATUS_COLORS[matched.status]}>{matched.status}</span>
                      </p>
                    ) : (
                      <p className="text-[9px] text-amber-500 font-bold mt-0.5">UNRESOLVED</p>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] theme-muted italic font-medium">None</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Helpers ───────────────────────────────────────────────────────────────

const VALID_CAPABILITIES = new Set<DefaultModelCapabilityUi>(['text', 'code', 'image', 'vision', 'embedding']);

function validCapabilitiesOf(model: LocalModelMetadata): DefaultModelCapabilityUi[] {
  return model.capabilities.filter((c): c is DefaultModelCapabilityUi =>
    VALID_CAPABILITIES.has(c as DefaultModelCapabilityUi)
  );
}

// ── Model row ─────────────────────────────────────────────────────────────

interface ModelRowProps {
  model: LocalModelMetadata;
  onRemoveSimulate: (id: string) => void;
  onRemove: (id: string) => void;
  onSetDefault: (cap: DefaultModelCapabilityUi, modelId: string) => void;
  busy: boolean;
  prefBusy: ReadonlySet<DefaultModelCapabilityUi>;
}

function ModelRow({ model, onRemoveSimulate, onRemove, onSetDefault, busy, prefBusy }: ModelRowProps) {
  const caps = validCapabilitiesOf(model);

  return (
    <tr className="border-b theme-divider hover:bg-indigo-500/5 transition-colors">
      <td className="py-4 px-4">
        <p className="text-xs font-black theme-title tracking-tight truncate max-w-[200px]" title={model.name}>{model.name}</p>
        <p className="text-[9px] theme-muted uppercase font-bold mt-0.5 tracking-wider">{model.runtime}</p>
      </td>
      <td className="py-4 px-4">
        <span className="text-[10px] font-black theme-secondary uppercase">{model.provider}</span>
      </td>
      <td className="py-4 px-4">
        <span className={`text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[model.status]}`}>
          {model.status}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-wrap gap-1">
          {model.capabilities.map(c => (
            <span key={c} className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase">
              {c}
            </span>
          ))}
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="flex flex-col items-end gap-1.5">
          {caps.map(cap => (
            <button
              key={cap}
              disabled={busy || prefBusy.has(cap)}
              onClick={() => onSetDefault(cap, model.id)}
              className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 disabled:opacity-40 uppercase tracking-widest"
            >
              Set as {cap}
            </button>
          ))}
          <div className="flex gap-2 mt-1">
            <button
              disabled={busy}
              onClick={() => onRemoveSimulate(model.id)}
              className="text-[9px] font-black text-zinc-500 hover:text-zinc-400 disabled:opacity-40 uppercase tracking-widest"
            >
              Simüle Et
            </button>
            <button
              disabled={busy}
              onClick={() => onRemove(model.id)}
              className="text-[9px] font-black text-rose-500/80 hover:text-rose-500 disabled:opacity-40 uppercase tracking-widest"
            >
              Kaldır
            </button>
          </div>
        </div>
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
  const [prefBusy, setPrefBusy] = useState<Set<DefaultModelCapabilityUi>>(new Set());
  const [actionResult, setActionResult] = useState<ModelLibraryActionResult | null>(null);
  const [prefResult, setPrefResult] = useState<{ ok: boolean; message: string } | null>(null);
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

  const handleRemove = async (modelId: string) => {
    if (!await safeConfirm(`Bu modeli tamamen kaldırmak istediğinize emin misiniz?\nModel ID: ${modelId}\n\nNot: Bu işlem geri alınamaz.`, { title: 'Modeli Kaldır' })) {
      return;
    }
    setActionBusy(true);
    setActionResult(null);
    try {
      const result = await removeModel(modelId);
      setActionResult(result);
      if (result.ok) {
        await loadList();
      }
    } catch {
      setError('Kaldırma işlemi sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSetDefault = async (cap: DefaultModelCapabilityUi, modelId: string) => {
    setPrefBusy(prev => new Set([...prev, cap]));
    setPrefResult(null);
    const result = await updateModelPreference(cap, modelId);
    if (result.ok && result.preferences) {
      setPreferences(result.preferences);
      setPrefResult({
        ok: true,
        message: `${CAPABILITY_LABELS[cap]} varsayılan modeli güncellendi. Bu işlem runtime'ı anında değiştirmez; yeni isteklerde seçim/fallback için kullanılır.`,
      });
    } else {
      setPrefResult({ ok: false, message: result.message });
    }
    setPrefBusy(prev => { const next = new Set(prev); next.delete(cap); return next; });
  };

  const handleClearPreference = async (cap: DefaultModelCapabilityUi) => {
    setPrefBusy(prev => new Set([...prev, cap]));
    setPrefResult(null);
    const result = await clearModelPreference(cap);
    if (result.ok && result.preferences) {
      setPreferences(result.preferences);
      setPrefResult({ ok: true, message: `${CAPABILITY_LABELS[cap]} tercihi temizlendi.` });
    } else {
      setPrefResult({ ok: false, message: result.message });
    }
    setPrefBusy(prev => { const next = new Set(prev); next.delete(cap); return next; });
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

      {/* Preference feedback */}
      {prefResult && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm mb-4 ${
            prefResult.ok
              ? 'bg-indigo-950/30 border-indigo-700/30 text-indigo-300'
              : 'bg-red-950/20 border-red-700/25 text-red-300'
          }`}
        >
          <span className="mt-0.5 shrink-0">
            {prefResult.ok ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
          </span>
          <span className="flex-1">{prefResult.message}</span>
          <button onClick={() => setPrefResult(null)} className="shrink-0 text-zinc-500 hover:text-zinc-300 ml-1 text-xs">✕</button>
        </div>
      )}

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
        prefBusy={prefBusy}
        onClear={handleClearPreference}
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
                  onRemove={handleRemove}
                  onSetDefault={handleSetDefault}
                  busy={actionBusy}
                  prefBusy={prefBusy}
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
