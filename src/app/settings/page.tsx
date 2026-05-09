'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FiCheckCircle, FiDownloadCloud, FiLoader, FiSettings, FiTrash2,
  FiZap, FiImage, FiCpu, FiBox,
} from 'react-icons/fi';
import { useSettings } from '@hooks/useSettings';
import type { AillameTier, LLMMode } from '@apptypes/settings';
import { isLegacyProvidersEnabled } from '@core/feature-flags/legacy-providers';

const MODES: Array<{ value: LLMMode; label: string; description: string }> = [
  { value: 'local', label: 'Local', description: 'Nano için yerel Rust çekirdeği.' },
  { value: 'hybrid', label: 'Hybrid (Experimental)', description: 'Deneysel uyumluluk modu.' },
  { value: 'cloud', label: 'Cloud (Legacy)', description: 'Eski uzak sağlayıcı modu.' },
];
const LEGACY_PROVIDERS_ENABLED = isLegacyProvidersEnabled();
function modeBadge(mode: LLMMode): string | undefined {
  if (mode === 'hybrid') return 'ADVANCED ONLY';
  if (mode === 'cloud') return 'DEPRECATED';
  return undefined;
}
const TIERS: Array<{ value: AillameTier; label: string; description: string }> = [
  { value: 'nano', label: 'Nano', description: 'Aillame Nano text-only yerel çekirdek.' },
  { value: 'pro', label: 'Pro', description: 'Qwen3-VL 8B multimodal chat ve SDXL görsel üretimi.' },
];

type ModelStatus = {
  id: string;
  label: string;
  purpose: 'chat' | 'image-generation';
  tier: AillameTier;
  runtime: string;
  repoId?: string;
  sizeLabel: string;
  capabilities: string[];
  description: string;
  installHint: string;
  installed: boolean;
  builtIn: boolean;
  cachePath?: string;
  runtimeAvailable: boolean;
};

type ActiveSelection = {
  activeChatModelId: string | null;
  activeImageModelId: string | null;
};

function purposeLabel(purpose: ModelStatus['purpose']) {
  return purpose === 'chat' ? 'Chat / LLM' : 'Görsel Üretim';
}

function ModelCard({
  model,
  activeChatModelId,
  activeImageModelId,
  installing,
  removing,
  activating,
  onInstall,
  onRemove,
  onActivate,
}: {
  model: ModelStatus;
  activeChatModelId: string | null;
  activeImageModelId: string | null;
  installing: string | null;
  removing: string | null;
  activating: string | null;
  onInstall: (id: string) => void;
  onRemove: (id: string, label: string) => void;
  onActivate: (id: string, type: 'chat' | 'image') => void;
}) {
  const isChat = model.purpose === 'chat';
  const isActiveChat = activeChatModelId === model.id;
  const isActiveImage = activeImageModelId === model.id;
  const isActive = isActiveChat || isActiveImage;
  const isBusy = installing === model.id || removing === model.id || activating === model.id;

  return (
    <article className={`rounded-[22px] border p-4 transition-all ${
      isActive
        ? 'border-indigo-400/40 bg-indigo-500/5'
        : 'border-white/10 bg-black/20'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-400">
              {purposeLabel(model.purpose)}
            </span>
            {model.builtIn && (
              <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[8px] font-black uppercase text-violet-300">
                Bundled
              </span>
            )}
            {isActive && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Aktif
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-white leading-tight">{model.label}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-400 line-clamp-2">{model.description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
          model.installed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
        }`}>
          {model.installed ? 'Kurulu' : 'Kurulabilir'}
        </span>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] text-gray-400">{model.tier}</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] text-gray-400">{model.runtime}</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] text-gray-400">{model.sizeLabel}</span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-[9px] text-gray-600 font-mono truncate max-w-[100px]">
          {model.cachePath ? `…/${model.cachePath.split(/[\\/]/).slice(-1)[0]}` : model.builtIn ? 'bundled' : '—'}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {/* Remove button — only installed, non-active, non-bundled */}
          {model.installed && !model.builtIn && !isActive && (
            <button
              type="button"
              onClick={() => onRemove(model.id, model.label)}
              disabled={isBusy}
              className="h-8 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 transition-all"
              title="Modeli kaldır"
            >
              {removing === model.id ? <FiLoader className="animate-spin" size={11} /> : <FiTrash2 size={11} />}
              <span className="hidden sm:inline">Kaldır</span>
            </button>
          )}

          {/* Activate / Active indicator */}
          {model.installed && !isActive && (
            <button
              type="button"
              onClick={() => onActivate(model.id, isChat ? 'chat' : 'image')}
              disabled={isBusy}
              className="h-8 px-3 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 transition-all"
            >
              {activating === model.id
                ? <FiLoader className="animate-spin" size={11} />
                : isChat ? <FiZap size={11} /> : <FiImage size={11} />}
              Kullan
            </button>
          )}

          {model.installed && isActive && (
            <div className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <FiCheckCircle size={11} />
              Aktif
            </div>
          )}

          {/* Install button — not installed */}
          {!model.installed && (
            <button
              type="button"
              onClick={() => onInstall(model.id)}
              disabled={isBusy || model.builtIn}
              className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 transition-all"
            >
              {installing === model.id
                ? <FiLoader className="animate-spin" size={11} />
                : <FiDownloadCloud size={11} />}
              Kur
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SettingsPage() {
  const { llmMode, setLlmMode, tier, setTier } = useSettings();
  const [legacyProvidersEnabled, setLegacyProvidersEnabled] = useState(LEGACY_PROVIDERS_ENABLED);
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [activeSelection, setActiveSelection] = useState<ActiveSelection>({ activeChatModelId: null, activeImageModelId: null });
  const [loadingModels, setLoadingModels] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const [modelsRes, activeRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/models/active'),
      ]);
      const modelsPayload = await modelsRes.json();
      const activePayload = await activeRes.json();
      if (!modelsRes.ok) throw new Error(modelsPayload.error || 'Model listesi alınamadı.');
      setModels(modelsPayload.models || []);
      setActiveSelection({
        activeChatModelId: activePayload.activeChatModelId ?? null,
        activeImageModelId: activePayload.activeImageModelId ?? null,
      });
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Model durumu alınamadı.');
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/legacy-providers')
      .then(r => r.json())
      .then(p => { if (!cancelled) setLegacyProvidersEnabled(p?.enabled === true); })
      .catch(() => { if (!cancelled) setLegacyProvidersEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!legacyProvidersEnabled && llmMode !== 'local') setLlmMode('local');
  }, [legacyProvidersEnabled, llmMode, setLlmMode]);

  const installModel = async (modelId: string) => {
    setInstalling(modelId); setModelError(null); setSuccessMsg(null);
    try {
      const res = await fetch('/api/models', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', modelId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Model kurulamadı.');
      await loadModels();
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Model kurulamadı.');
    } finally { setInstalling(null); }
  };

  const removeModel = async (modelId: string, label: string) => {
    if (!window.confirm(`'${label}' modelini kaldırmak istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)) return;
    setRemoving(modelId); setModelError(null); setSuccessMsg(null);
    try {
      const res = await fetch('/api/models', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', modelId }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || payload.message || 'Model kaldırılamadı.');
      setSuccessMsg(`'${label}' başarıyla kaldırıldı.`);
      await loadModels();
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Model kaldırılamadı.');
    } finally { setRemoving(null); }
  };

  const activateModel = async (modelId: string, type: 'chat' | 'image') => {
    setActivating(modelId); setModelError(null); setSuccessMsg(null);
    try {
      const res = await fetch('/api/models/active', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, modelId }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Aktif model ayarlanamadı.');
      setSuccessMsg(payload.message || 'Aktif model güncellendi.');
      await loadModels();
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Aktif model ayarlanamadı.');
    } finally { setActivating(null); }
  };

  const activeChatModel = models.find(m => m.id === activeSelection.activeChatModelId);
  const activeImageModel = models.find(m => m.id === activeSelection.activeImageModelId);
  const chatModels = models.filter(m => m.purpose === 'chat');
  const imageModels = models.filter(m => m.purpose === 'image-generation');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pt-12 md:pt-20 pb-12 animate-fade-in">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <FiSettings size={14} className="text-indigo-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Model Yönetimi</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">Ayarlar</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Active model summary */}
          <section className="glass-card rounded-[28px] p-5 border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Aktif Modeller</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <FiZap size={14} className="text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Aktif LLM</p>
                  <p className="text-sm font-bold text-white truncate">
                    {activeChatModel?.label ?? <span className="text-gray-500 italic text-xs">Seçilmedi</span>}
                  </p>
                  {activeChatModel && (
                    <p className="text-[9px] text-indigo-400 font-mono">{activeChatModel.runtime}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <FiImage size={14} className="text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Aktif Görsel Modeli</p>
                  <p className="text-sm font-bold text-white truncate">
                    {activeImageModel?.label ?? <span className="text-gray-500 italic text-xs">Seçilmedi</span>}
                  </p>
                  {activeImageModel && (
                    <p className="text-[9px] text-violet-400 font-mono">{activeImageModel.runtime}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center flex-shrink-0">
                  <FiCpu size={14} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Çalışma Modu</p>
                  <p className="text-sm font-bold text-white uppercase">{llmMode}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Tier selection */}
          <section className="glass-card rounded-[28px] p-5 border-white/5">
            <div className="relative z-10 space-y-5">
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Aktif Tier</h2>
                <div className="grid grid-cols-2 gap-2">
                  {TIERS.map(item => (
                    <button key={item.value} type="button" onClick={() => setTier(item.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                        tier === item.value
                          ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100'
                          : 'border-white/10 bg-black/20 text-gray-400 hover:text-gray-200'
                      }`}>
                      <span className="block text-xs font-black uppercase">{item.label}</span>
                      <span className="mt-1 block text-[10px] leading-relaxed opacity-70">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">LLM Modu</h2>
                <div className="space-y-2">
                  {MODES.filter(mode => legacyProvidersEnabled || mode.value === 'local').map(mode => (
                    <button key={mode.value} type="button" onClick={() => setLlmMode(mode.value)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                        llmMode === mode.value
                          ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100'
                          : 'border-white/10 bg-black/20 text-gray-400 hover:text-gray-200'
                      }`}>
                      <span className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-widest">
                        <span>{mode.label}</span>
                        {modeBadge(mode.value) && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[8px] text-amber-300">
                            {modeBadge(mode.value)}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[10px] opacity-70">{mode.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right panel — model inventory */}
        <section className="glass-card rounded-[28px] p-5 border-white/5">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300">Yerel Model Envanteri</h2>
                <p className="mt-1 text-xs text-gray-500">Kurulu modelleri aktif yapın, yeni model yükleyin veya kaldırın.</p>
              </div>
              <button type="button" onClick={loadModels}
                className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <FiLoader size={12} className={loadingModels ? 'animate-spin' : ''} />
                Yenile
              </button>
            </div>

            {modelError && (
              <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{modelError}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-start gap-2">
                <FiCheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {loadingModels ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <FiLoader className="animate-spin" size={28} />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Chat models */}
                {chatModels.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FiZap size={12} className="text-indigo-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                        Chat / LLM Modelleri
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {chatModels.map(model => (
                        <ModelCard
                          key={model.id} model={model}
                          activeChatModelId={activeSelection.activeChatModelId}
                          activeImageModelId={activeSelection.activeImageModelId}
                          installing={installing} removing={removing} activating={activating}
                          onInstall={installModel} onRemove={removeModel} onActivate={activateModel}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Image models */}
                {imageModels.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FiImage size={12} className="text-violet-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                        Görsel Üretim Modelleri
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {imageModels.map(model => (
                        <ModelCard
                          key={model.id} model={model}
                          activeChatModelId={activeSelection.activeChatModelId}
                          activeImageModelId={activeSelection.activeImageModelId}
                          installing={installing} removing={removing} activating={activating}
                          onInstall={installModel} onRemove={removeModel} onActivate={activateModel}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {models.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-12 text-gray-600">
                    <FiBox size={32} />
                    <p className="text-sm">Model bulunamadı.</p>
                    <p className="text-xs">Model klasörünü kontrol edin veya Yenile butonuna basın.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
