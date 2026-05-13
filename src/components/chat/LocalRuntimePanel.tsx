import React, { useState } from 'react';
import { useRuntimeStatus } from '@hooks/useRuntimeStatus';
import { tauriModelBridge } from '@core/platform/tauri-model-bridge';
import { 
  FiCpu, 
  FiBox, 
  FiActivity, 
  FiAlertCircle, 
  FiLoader, 
  FiCheckCircle, 
  FiXCircle, 
  FiSettings,
  FiPower,
  FiRefreshCw,
  FiSlash
} from 'react-icons/fi';

export const LocalRuntimePanel: React.FC = () => {
  const { session, loading, refresh } = useRuntimeStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartRuntime = async () => {
    console.info("[LocalRuntimePanel] Runtime Başlat clicked");
    setBusy(true);
    setError(null);
    try {
      console.info("[LocalRuntimePanel] calling tauriModelBridge.startRuntime");
      const response = await tauriModelBridge.startRuntime({
        devicePreference: "auto"
      });
      console.info('[LocalRuntimePanel] startRuntime resolved:', response);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[LocalRuntimePanel] startRuntime failed:', msg);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleStopRuntime = async () => {
    setBusy(true);
    try {
      await tauriModelBridge.stopRuntime();
      await refresh();
    } catch (err) {
      console.error('Runtime stop failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleUnloadModel = async () => {
    setBusy(true);
    try {
      await tauriModelBridge.safeModelUnload();
      await refresh();
    } catch (err) {
      console.error('Model unload failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelLoad = async () => {
    setBusy(true);
    try {
      await tauriModelBridge.safeModelCancelLoad();
      await refresh();
    } catch (err) {
      console.error('Model load cancel failed:', err);
    } finally {
      setBusy(false);
    }
  };

  if (!session && !loading) {
    return (
      <div className="theme-surface rounded-2xl border border-rose-500/10 p-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
          <FiPower className="text-rose-500" size={24} />
        </div>
        <h3 className="text-sm font-bold theme-title mb-2">Runtime Kapalı</h3>
        <p className="text-xs theme-muted mb-4 max-w-[200px]">
          Yerel modelleri kullanabilmek için Aillame yan sürecini başlatmalısın.
        </p>
        <button
          disabled={busy}
          onClick={handleStartRuntime}
          className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all disabled:opacity-50"
        >
          {busy ? 'Başlatılıyor...' : 'Runtime Başlat'}
        </button>
        {error && (
          <p className="mt-3 text-[10px] text-rose-500 font-medium leading-tight">
            Runtime error: {error}
          </p>
        )}
      </div>
    );
  }

  const isModelLoaded = session?.processState === 'loaded';
  const isModelLoading = session?.processState === 'loading' || session?.processState === 'preparing_load';

  return (
    <div className="theme-surface rounded-2xl border border-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black theme-muted uppercase tracking-[0.2em]">Sistem Durumu</h3>
        <button onClick={refresh} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
          <FiRefreshCw size={12} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Runtime State */}
        <div className="flex items-center justify-between p-3 rounded-xl theme-elevated">
          <div className="flex items-center gap-3">
            <FiCpu className="theme-muted" size={16} />
            <div>
              <p className="text-[10px] font-bold theme-title leading-none">Sidecar Runtime</p>
              <p className="text-[9px] theme-muted mt-1 uppercase tracking-tighter">
                {session?.runtimeLabel || 'Aillame Local'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={handleStopRuntime}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500/60 hover:text-rose-500 transition-all disabled:opacity-20"
              title="Sistemi Durdur"
            >
              <FiPower size={14} />
            </button>
          </div>
        </div>

        {/* Model State */}
        <div className="flex items-center justify-between p-3 rounded-xl theme-elevated">
          <div className="flex items-center gap-3">
            <FiBox className="theme-muted" size={16} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold theme-title leading-none">Aktif Model</p>
              <p className="text-[9px] theme-muted mt-1 truncate max-w-[140px]">
                {session?.activeModelId || (isModelLoading ? 'Yükleniyor...' : 'Model Yüklü Değil')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isModelLoaded ? (
              <button
                disabled={busy}
                onClick={handleUnloadModel}
                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500/60 hover:text-amber-500 transition-all disabled:opacity-20"
                title="Modeli Boşalt"
              >
                <FiSlash size={14} />
              </button>
            ) : isModelLoading ? (
              <button
                disabled={busy}
                onClick={handleCancelLoad}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500/60 hover:text-rose-500 transition-all disabled:opacity-20"
                title="Yüklemeyi İptal Et"
              >
                <FiXCircle size={14} />
              </button>
            ) : (
              <a
                href="/library"
                className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-500/60 hover:text-indigo-500 transition-all"
                title="Model Seç"
              >
                <FiSettings size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Inference State */}
        {session?.isInferring && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <FiActivity className="text-indigo-400 animate-pulse" size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Çıkarım Yapılıyor</span>
          </div>
        )}
      </div>

      {session?.lastErrorCode && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
          <FiAlertCircle className="text-rose-500 mt-0.5" size={14} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Hata Bildirimi</p>
            <p className="text-[9px] theme-muted mt-1 leading-relaxed">
              {session.lastErrorCode}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
