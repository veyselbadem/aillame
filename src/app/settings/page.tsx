'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiDownloadCloud, FiLoader, FiSettings } from 'react-icons/fi';
import { useSettings } from '@hooks/useSettings';
import type { AillameTier, LLMMode } from '@apptypes/settings';

const MODES: Array<{ value: LLMMode; label: string; description: string }> = [
  { value: 'local', label: 'Local', description: 'Nano için yerel Rust çekirdeği.' },
  { value: 'hybrid', label: 'Hybrid', description: 'Yerel uygun değilse API katmanına düşer.' },
  { value: 'cloud', label: 'Cloud', description: 'Uzak API sağlayıcısı.' },
];

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

function purposeLabel(purpose: ModelStatus['purpose']) {
  return purpose === 'chat' ? 'Chat / Analiz Modeli' : 'Görsel Üretim Modeli';
}

export default function SettingsPage() {
  const { llmMode, setLlmMode, tier, setTier } = useSettings();
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  const loadModels = async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const response = await fetch('/api/models');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Model durumu alınamadı.');
      setModels(payload.models);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Model durumu alınamadı.');
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const installModel = async (modelId: string) => {
    setInstalling(modelId);
    setModelError(null);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', modelId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Model kurulamadı.');
      await loadModels();
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Model kurulamadı.');
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pt-12 md:pt-20 pb-12 animate-fade-in">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <FiSettings size={14} className="text-indigo-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Model Yönetimi</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">Ayarlar</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        <section className="glass-card rounded-[28px] p-5 border-white/5">
          <div className="relative z-10 space-y-7">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300 mb-3">Aktif Tier</h2>
              <div className="grid grid-cols-2 gap-2">
                {TIERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTier(item.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      tier === item.value
                        ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100'
                        : 'border-white/10 bg-black/20 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className="block text-sm font-black uppercase">{item.label}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed opacity-70">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300 mb-3">LLM Modu</h2>
              <div className="space-y-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setLlmMode(mode.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                      llmMode === mode.value
                        ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100'
                        : 'border-white/10 bg-black/20 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className="block text-xs font-black uppercase tracking-widest">{mode.label}</span>
                    <span className="mt-1 block text-[11px] opacity-70">{mode.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[28px] p-5 border-white/5">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300">Yerel Model Envanteri</h2>
                <p className="mt-1 text-xs text-gray-500">Nano, Pro Qwen3-VL ve SDXL kurulum durumları.</p>
              </div>
              <button
                type="button"
                onClick={loadModels}
                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-widest"
              >
                Yenile
              </button>
            </div>

            {modelError && (
              <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {modelError}
              </div>
            )}

            {loadingModels ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <FiLoader className="animate-spin" size={28} />
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {models.map((model) => (
                  <article key={model.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">{purposeLabel(model.purpose)}</p>
                        <h3 className="mt-2 text-lg font-black text-white">{model.label}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-gray-400">{model.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        model.installed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                      }`}>
                        {model.installed ? 'Hazır' : 'Kurulabilir'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="tool-badge done">{model.tier}</span>
                      <span className="tool-badge running">{model.runtime}</span>
                      <span className="tool-badge running">{model.sizeLabel}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {model.capabilities.map((capability) => (
                        <span key={capability} className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-gray-400">
                          {capability}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 text-[11px] text-gray-500">
                      {model.repoId ? model.repoId : model.installHint}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-[10px] text-gray-600 font-mono truncate">
                        {model.cachePath || (model.builtIn ? 'bundled' : 'not downloaded')}
                      </div>
                      <button
                        type="button"
                        onClick={() => installModel(model.id)}
                        disabled={model.builtIn || installing === model.id}
                        className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                      >
                        {model.installed ? <FiCheckCircle size={14} /> : installing === model.id ? <FiLoader className="animate-spin" size={14} /> : <FiDownloadCloud size={14} />}
                        {model.installed ? 'Hazır' : 'Kur'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
