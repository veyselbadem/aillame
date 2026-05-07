'use client';

import React, { useEffect, useState } from 'react';
import { RiBrainLine, RiDatabaseLine, RiLineChartLine, RiPulseLine, RiTerminalBoxLine } from 'react-icons/ri';

interface Stats {
  lossHistory: { epoch: number; loss: number }[];
  currentVocab: number;
  knowledgeLines: number;
  totalEpochs: number;
  currentEpoch: number;
  recentLogs: string[];
  isLearning: boolean;
}

const NANO_FOUNDATION = [
  ['Instruction Dataset', 'ready for validation'],
  ['Safety/Fallback', 'candidate examples'],
  ['Feedback Loop', 'pending-review only'],
  ['Long-Term Hooks', 'advisory · autonomous disabled'],
] as const;

export default function IntelligenceDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/intelligence/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {
      // UI stays diagnostic-only.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-blue-400">
        <RiPulseLine className="mr-2 animate-pulse text-3xl" />
        <span>Aillame intelligence diagnostic yükleniyor...</span>
      </div>
    );
  }

  const progress = stats && stats.totalEpochs > 0 ? (stats.currentEpoch / stats.totalEpochs) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#050505] p-8 text-slate-300 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-light tracking-widest text-slate-900 dark:text-white uppercase">
            <RiBrainLine className="mr-4 text-blue-500" />
            Aillame Intelligence <span className="ml-3 text-blue-500 font-bold">Monitor</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Nano dataset, feedback candidate ve long-term hook durumları. Otonom aksiyonlar kapalıdır.</p>
        </div>
        <button onClick={fetchStats} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10 transition-colors">
          Yenile
        </button>
      </div>

      <section className="mb-8 grid gap-3 md:grid-cols-4">
        {NANO_FOUNDATION.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-300">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard icon={<RiLineChartLine />} label="Mevcut Hata Payı" value={stats?.lossHistory[stats.lossHistory.length - 1]?.loss.toFixed(4) || '---'} color="text-blue-400" sub="Diagnostic metric" />
        <StatCard icon={<RiBrainLine />} label="Sözlük Kapasitesi" value={stats?.currentVocab.toString() || '0'} color="text-purple-400" sub="Benzersiz karakter" />
        <StatCard icon={<RiDatabaseLine />} label="Bilgi Tabanı" value={stats?.knowledgeLines.toLocaleString() || '0'} color="text-cyan-400" sub="Toplam satır" />
        <StatCard icon={<RiPulseLine />} label="Eğitim İlerlemesi" value={`%${progress.toFixed(2)}`} color="text-amber-400" sub={`${stats?.currentEpoch ?? 0} / ${stats?.totalEpochs ?? 0} epoch`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
          <h3 className="mb-6 flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
            <RiLineChartLine className="mr-2" /> Nano Diagnostic Curve
          </h3>
          <div className="flex h-64 items-end space-x-2 overflow-hidden px-4">
            {stats?.lossHistory.map((item, i) => (
              <div key={i} className="group relative flex flex-1 flex-col items-center">
                <div className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/20 to-blue-400 transition-all duration-500 hover:to-white" style={{ height: `${Math.max(10, (10 / item.loss) * 20)}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
          <h3 className="mb-6 flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
            <RiTerminalBoxLine className="mr-2" /> Diagnostic Log Preview
          </h3>
          <div className="h-64 overflow-y-auto rounded-lg bg-black/50 p-4 font-mono text-xs text-blue-400/80">
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
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 transition-all hover:border-white/10">
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
