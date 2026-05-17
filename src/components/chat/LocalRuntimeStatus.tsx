import React from 'react';
import { useRuntimeStatus } from '@hooks/useRuntimeStatus';
import { FiCpu, FiBox, FiActivity, FiAlertCircle, FiLoader, FiCheckCircle, FiXCircle, FiPlayCircle, FiZap } from 'react-icons/fi';

export const LocalRuntimeStatus: React.FC = () => {
  const { session, loading } = useRuntimeStatus();

  if (loading && !session) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 animate-pulse">
        <FiLoader className="animate-spin text-indigo-400" size={12} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/70">Durum Kontrolü...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
        <FiAlertCircle className="text-rose-400" size={12} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400/80">Runtime Kapalı</span>
      </div>
    );
  }

  const getProcessLabel = (state: string) => {
    switch (state) {
      case 'not_started': return 'Model Seçilmedi';
      case 'runtime_ready': return 'Yüklemeye Hazır';
      case 'loaded': return 'Model Hazır';
      default: return state.toUpperCase();
    }
  };

  const isModelActive = session.isLoaded;

  return (
    <div className="flex items-center gap-3">
      {/* Runtime Status */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
        session.isLoaded
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : session.isSelected
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
      }`}>
        {session.isLoaded ? (
          <FiCheckCircle size={12} />
        ) : session.isSelected ? (
          <FiPlayCircle size={12} />
        ) : (
          <FiXCircle size={12} />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {getProcessLabel(session.processState)}
        </span>
      </div>

      {/* Active Model Info */}
      {isModelActive && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          <FiBox size={12} />
          <span className="text-[10px] font-bold tracking-wider max-w-[120px] truncate">
            {session.activeModelId}
          </span>
          {session.isInferring && (
            <div className="flex items-center gap-1.5 ml-1 border-l border-white/10 pl-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-400">Üretiliyor</span>
            </div>
          )}
        </div>
      )}

      {/* Health Info (Hardening) */}
      {session.health?.runtime && (
        <div className="flex items-center gap-3 ml-2 border-l border-white/5 pl-4">
          {session.health.runtime.gpu === 'enabled' && (
            <div className="flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <FiZap size={10} /> GPU
            </div>
          )}
          {session.health.runtime.devGate === 'active' && (
            <div title="Geliştirme modunda native inference devre dışı. Gerçek local inference için api:build sonrası node dist/server.js kullanın." className="flex items-center gap-1 text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/20 cursor-help">
              <FiAlertCircle size={10} /> DevGate
            </div>
          )}
        </div>
      )}
    </div>
  );
};
