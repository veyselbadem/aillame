import React from 'react';
import { useRuntimeStatus } from '@hooks/useRuntimeStatus';
import { FiCpu, FiBox, FiActivity, FiAlertCircle, FiLoader, FiCheckCircle, FiXCircle } from 'react-icons/fi';

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
      case 'not_started': return 'Başlatılmadı';
      case 'starting': return 'Başlatılıyor...';
      case 'runtime_ready': return 'Sistem Hazır';
      case 'loaded': return 'Model Hazır';
      case 'stopping': return 'Durduruluyor...';
      case 'crashed': return 'Beklenmedik Hata';
      case 'failed': return 'Hata Oluştu';
      default: return state.toUpperCase();
    }
  };

  const isModelActive = session.processState === 'loaded' && session.activeModelId;

  return (
    <div className="flex items-center gap-3">
      {/* Runtime Status */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
        session.processState === 'loaded' || session.processState === 'runtime_ready'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : session.processState === 'starting' || session.processState === 'stopping'
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
      }`}>
        {session.processState === 'starting' || session.processState === 'stopping' ? (
          <FiLoader className="animate-spin" size={12} />
        ) : session.processState === 'loaded' || session.processState === 'runtime_ready' ? (
          <FiCheckCircle size={12} />
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

      {/* Error Info */}
      {session.lastErrorCode && session.processState !== 'loaded' && (
        <div className="flex items-center gap-1.5 text-rose-400 animate-pulse">
          <FiAlertCircle size={12} />
          <span className="text-[9px] font-bold uppercase tracking-tight">Hata: {session.lastErrorCode}</span>
        </div>
      )}
    </div>
  );
};
