'use client';

import React, { useState } from 'react';
import { 
  FiPackage, 
  FiPlay, 
  FiCpu, 
  FiFolder, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiLoader,
  FiArrowLeft,
  FiZap,
  FiHardDrive,
  FiInfo
} from 'react-icons/fi';
// import { open } from '@tauri-apps/plugin-dialog'; // REMOVED: Using REST API
// import { tauriModelBridge } from '@core/platform/tauri-model-bridge'; // REMOVED: Using REST API
import { useRuntimeStatus } from '@hooks/useRuntimeStatus';
import { aillameFetch } from '@/lib/aillame-api-client';
import { safeConfirm } from '@/lib/confirm';
import Link from 'next/link';

export default function GgufModelSelector() {
  const { session, refresh: refreshStatus } = useRuntimeStatus();
  const [installedModels, setInstalledModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchInstalledModels = async () => {
    setFetching(true);
    try {
      const res = await aillameFetch('/api/aillame/models/installed');
      const data = await res.json();
      if (data.models) {
        setInstalledModels(data.models.filter((model: any) => model.status === 'registered'));
      }
    } catch (err) {
      console.error('Failed to fetch installed models:', err);
      setError('Yüklü modeller alınamadı.');
    } finally {
      setFetching(false);
    }
  };

  React.useEffect(() => {
    fetchInstalledModels();
  }, []);

  const handleSelectModel = async (modelId: string) => {
    const model = installedModels.find(m => m.id === modelId);
    if (model && (model.isExperimental || model.unsupportedReason)) {
      if (!await safeConfirm(`DİKKAT: ${modelId} modeli mevcut runtime tarafından tam desteklenmiyor olabilir. Yine de seçmek istiyor musun?`, { title: 'Model Seçimi' })) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await aillameFetch('/api/aillame/models/select', {
        method: 'POST',
        body: JSON.stringify({ modelId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Model seçimi başarısız.');
      
      setSelectedModelId(modelId);
      setSuccess(`Model seçildi: ${modelId}`);
      await refreshStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadModel = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await aillameFetch('/api/aillame/models/load', {
        method: 'POST'
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Model yüklenirken bir hata oluştu.');
      }

      setSuccess('Model yükleme işlemi başlatıldı.');
      await refreshStatus();
    } catch (err: any) {
      setError(err?.message || 'Model yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const runtimeActive = session?.processState === 'runtime_ready' || session?.processState === 'loaded';
  const modelLoaded = session?.processState === 'loaded';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <Link 
          href="/chat"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/60 hover:text-indigo-400 transition-colors"
        >
          <FiArrowLeft />
          Sohbete Dön
        </Link>
      </div>

      {/* Runtime Status */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${runtimeActive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${runtimeActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            <FiCpu size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Runtime Durumu</p>
            <p className="text-sm font-bold">{runtimeActive ? 'Sistem Hazır' : 'Runtime Kapalı'}</p>
          </div>
        </div>
        {!runtimeActive && (
          <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Runtime başlatılmalı</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Model Selection */}
        <div className="theme-surface rounded-[32px] p-8 border border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <FiFolder size={24} />
            </div>
            <h3 className="text-lg font-black theme-title">GGUF Model Seç</h3>
          </div>

          <div className="space-y-4">
            <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {fetching ? (
                <div className="flex items-center justify-center py-8">
                  <FiLoader className="animate-spin text-indigo-500" size={24} />
                </div>
              ) : installedModels.length > 0 ? (
                installedModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all group ${
                      selectedModelId === m.id || session?.activeModelId === m.id
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    } ${m.isExperimental || m.unsupportedReason ? 'opacity-70 grayscale-[0.5]' : ''}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FiPackage className={selectedModelId === m.id || session?.activeModelId === m.id ? 'text-indigo-400' : 'theme-muted'} />
                      <div className="text-left overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold theme-title truncate">{m.name || m.id}</p>
                          {m.id.includes('qwen') && (
                            <span className="text-[7px] font-black uppercase bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-500/30">Önerilen</span>
                          )}
                          {(m.isExperimental || m.unsupportedReason) && (
                            <span className="text-[7px] font-black uppercase bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-md border border-rose-500/30">Unsupported</span>
                          )}
                        </div>
                        <p className="text-[9px] theme-muted uppercase font-black tracking-tighter">{m.id}</p>
                        {m.unsupportedReason && (
                          <p className="text-[8px] text-rose-400/80 font-bold mt-1 leading-tight">{m.unsupportedReason}</p>
                        )}
                      </div>
                    </div>
                    {session?.activeModelId === m.id && (
                      <span className="text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full">Aktif</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8 theme-muted">
                  <FiAlertCircle className="mx-auto mb-2 opacity-20" size={24} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Kayıtlı model bulunamadı</p>
                </div>
              )}
            </div>

            <button
              disabled={(!selectedModelId && !session?.activeModelId) || loading}
              onClick={handleLoadModel}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiPlay />}
              <span>{modelLoaded ? 'Yeniden Yükle' : 'Belleğe Yükle'}</span>
            </button>
          </div>
        </div>

        {/* Active Model Status */}
        <div className="theme-surface rounded-[32px] p-8 border border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <FiZap size={24} />
            </div>
            <h3 className="text-lg font-black theme-title">Aktif Model</h3>
          </div>

          {modelLoaded && session?.activeModelId ? (
            <div className="space-y-4 animate-slide-up">
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Yüklü Model</p>
                <p className="text-sm font-bold theme-title">{session.activeModelId}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest theme-muted mb-1">Cihaz</p>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase">Auto (Hybrid)</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest theme-muted mb-1">Statü</p>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Hazır</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[140px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl opacity-40">
              <FiInfo className="mb-2" size={24} />
              <p className="text-xs font-bold uppercase tracking-widest">Model Yüklü Değil</p>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 animate-slide-up">
          <FiAlertCircle className="shrink-0" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 animate-slide-up">
          <FiCheckCircle className="shrink-0" />
          <p className="text-xs font-bold">{success}</p>
        </div>
      )}

      {/* Tips */}
      <div className="theme-soft-panel rounded-2xl p-6 flex items-start gap-4 border border-white/5">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
          <FiInfo size={20} />
        </div>
        <div>
          <h3 className="text-xs font-bold theme-title mb-1 uppercase tracking-widest">Önerilen Modeller</h3>
          <p className="text-[11px] theme-muted leading-relaxed">
            Başlangıç için <span className="text-indigo-400 font-bold">Qwen2.5-0.5B-Instruct-GGUF</span> veya <span className="text-indigo-400 font-bold">Llama-3.2-1B-GGUF</span> modellerini öneririz. 
            Bu modeller düşük sistem kaynağı ile hızlı çıkarım sağlar. Dosya yolunda boşluk veya özel karakter olmamasına dikkat edin.
          </p>
        </div>
      </div>
    </div>
  );
}
