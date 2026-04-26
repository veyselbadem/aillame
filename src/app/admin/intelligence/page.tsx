'use client';

import React, { useEffect, useState } from 'react';
import { 
  RiBrainLine, 
  RiRadarLine, 
  RiDatabaseLine, 
  RiLineChartLine,
  RiPulseLine,
  RiTerminalBoxLine
} from 'react-icons/ri';

interface Stats {
  lossHistory: { epoch: number; loss: number }[];
  currentVocab: number;
  knowledgeLines: number;
  totalEpochs: number;
  currentEpoch: number;
  recentLogs: string[];
  isLearning: boolean;
}

export default function IntelligenceDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/intelligence/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // 5 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-blue-400">
        <RiPulseLine className="mr-2 animate-pulse text-3xl" />
        <span>Aillame Nöral Ağ Bağlantısı Kuruluyor...</span>
      </div>
    );
  }

  const progress = stats ? (stats.currentEpoch / stats.totalEpochs) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#050505] p-8 text-slate-300 font-sans">
      {/* Header */}
      <div className="mb-12 flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="flex items-center text-3xl font-light tracking-widest text-slate-900 dark:text-white uppercase">
            <RiBrainLine className="mr-4 text-blue-500" />
            Aillame Intelligence <span className="ml-3 text-blue-500 font-bold">Monitor</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Çekirdek motor gelişim ve nöral adaptasyon verileri</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 rounded-full border border-green-500/30 bg-green-500/5 px-4 py-1 text-xs text-green-400">
            <div className="h-2 w-2 animate-ping rounded-full bg-green-500"></div>
            <span>TURBO MARATON AKTİF</span>
          </div>
          <button 
            onClick={fetchStats}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10 transition-colors"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard 
          icon={<RiLineChartLine />} 
          label="Mevcut Hata Payı (Loss)" 
          value={stats?.lossHistory[stats.lossHistory.length-1]?.loss.toFixed(4) || '---'} 
          color="text-blue-400"
          sub="Düşük olması zekayı artırır"
        />
        <StatCard 
          icon={<RiRadarLine />} 
          label="Sözlük Kapasitesi" 
          value={stats?.currentVocab.toString() || '0'} 
          color="text-purple-400"
          sub="Öğrenilen benzersiz karakter"
        />
        <StatCard 
          icon={<RiDatabaseLine />} 
          label="Bilgi Tabanı" 
          value={stats?.knowledgeLines.toLocaleString() || '0'} 
          color="text-cyan-400"
          sub="Toplam tecrübe satırı"
        />
        <StatCard 
          icon={<RiPulseLine />} 
          label="Eğitim İlerlemesi" 
          value={`%${progress.toFixed(2)}`} 
          color="text-amber-400"
          sub={`${stats?.currentEpoch} / ${stats?.totalEpochs} epoch`}
        />
      </div>

      {/* Main Analysis Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Loss Graph Visual Representation */}
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
          <h3 className="mb-6 flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
            <RiLineChartLine className="mr-2" /> Nöral Gelişim Grafiği (Loss Curve)
          </h3>
          <div className="flex h-64 items-end space-x-2 overflow-hidden px-4">
            {stats?.lossHistory.map((item, i) => (
              <div 
                key={i} 
                className="group relative flex flex-1 flex-col items-center"
              >
                <div 
                  className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/20 to-blue-400 transition-all duration-500 hover:to-white"
                  style={{ height: `${Math.max(10, (10 / item.loss) * 20)}%` }}
                ></div>
                <div className="absolute -top-8 hidden text-[10px] text-white group-hover:block">
                  {item.loss.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[10px] text-slate-600">
            <span>Başlangıç</span>
            <span>Şu anki Durum</span>
          </div>
        </div>

        {/* Live Terminal Logs */}
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
          <h3 className="mb-6 flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
            <RiTerminalBoxLine className="mr-2" /> Canlı Çekirdek Logları
          </h3>
          <div className="h-64 overflow-y-auto rounded-lg bg-black/50 p-4 font-mono text-xs text-blue-400/80 scrollbar-hide">
             {stats?.recentLogs.map((log, i) => (
               <div key={i} className="mb-1 border-l-2 border-blue-500/20 pl-2">
                 <span className="text-[10px] text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                 {log}
               </div>
             ))}
             <div className="animate-pulse">_</div>
          </div>
        </div>
      </div>
      
      {/* Footer / Status */}
      <div className="mt-8 text-center text-[10px] text-slate-700 uppercase tracking-[0.2em]">
        Aillame Hybrid Brain Engine v1.0.4 • Powered by Rust & TensorFlow.js
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }: { icon: any, label: string, value: string, color: string, sub: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 transition-all hover:border-white/10 hover:shadow-blue-500/5 hover:shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className={`text-xl ${color} opacity-80`}>{icon}</div>
        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Live</div>
      </div>
      <div className={`text-3xl font-bold tracking-tight ${color}`}>{value}</div>
      <div className="mt-2 text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-[10px] text-slate-600 italic">{sub}</div>
    </div>
  );
}
