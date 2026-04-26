'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LocalMemoryStore } from '@providers/memory/local';
import {
  FiActivity, FiMessageCircle, FiCpu, FiLogOut,
  FiZap, FiDatabase, FiBox, FiTrendingDown,
  FiCheckCircle, FiAlertCircle, FiRefreshCw,
  FiKey, FiClipboard, FiLayers, FiBook, FiThumbsUp,
  FiShield, FiArrowRight,
} from 'react-icons/fi';
import StatusBadge from '@components/ui/StatusBadge';

const memory = new LocalMemoryStore();

interface BrainStats {
  lossHistory: { epoch: number; loss: number }[];
  bestLoss: number | null;
  currentLoss: number | null;
  totalEpochs: number;
  dataSize: number;
  dataLines: number;
  hasCheckpoint: boolean;
  checkpointTime: string | null;
  rustCoreStatus: string;
  memoryEntries: number;
}

// ── Quick link cards ──────────────────────────────────────────────────────
const QUICK_LINKS = [
  { href: '/admin/api-clients',          label: 'API İstemcileri',     icon: FiKey,       color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/15' },
  { href: '/admin/agent-tasks',          label: 'Agent Görevleri',     icon: FiClipboard, color: 'text-blue-400 bg-blue-500/10 border-blue-500/15' },
  { href: '/admin/memory-write-queue',   label: 'Hafıza Kuyruğu',      icon: FiDatabase,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/15' },
  { href: '/admin/research-results',     label: 'Araştırma Sonuçları', icon: FiBook,      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/15' },
  { href: '/admin/feedback',             label: 'Feedback Yönetimi',   icon: FiThumbsUp,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
  { href: '/admin/distillation-preview', label: 'Damıtma Önizleme',    icon: FiLayers,    color: 'text-purple-400 bg-purple-500/10 border-purple-500/15' },
] as const;

// ── MVP Status rows ───────────────────────────────────────────────────────
const MVP_STATUS = [
  { label: 'Nano Chat',          desc: 'POST /api/core/chat',        variant: 'active'    as const },
  { label: 'Orchestration',      desc: 'Smart routing enabled',      variant: 'active'    as const },
  { label: 'AI Laboratory',      desc: 'Session manager ready',      variant: 'active'    as const },
  { label: 'Provider API',       desc: 'Auth korumalı',              variant: 'protected' as const },
  { label: 'Memory Write',       desc: 'Admin review gerekli',       variant: 'review'    as const },
  { label: 'Tool Execution',     desc: 'Disabled / planning only',   variant: 'disabled'  as const },
];

// ── Next actions (roadmap) ────────────────────────────────────────────────
const NEXT_ACTIONS = [
  { label: 'Self Review Agent',    note: 'Planlama aşamasında' },
  { label: 'BOSS Client',          note: 'API client oluşturulacak' },
  { label: 'Eğitim Client',        note: 'API client oluşturulacak' },
  { label: 'Tauri Desktop Shell',  note: 'MVP sonrası' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ conversations: 0, messages: 0 });
  const [brainStats, setBrainStats] = useState<BrainStats | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uptime, setUptime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) { router.push('/admin/login'); return; }
    setAuthorized(true);
    loadStats();
    loadBrainStats();
    const interval = setInterval(loadBrainStats, 5000);
    const uptimeInterval = setInterval(() => setUptime(u => u + 1), 1000);
    return () => { clearInterval(interval); clearInterval(uptimeInterval); };
  }, []);

  useEffect(() => {
    if (brainStats?.lossHistory && brainStats.lossHistory.length > 0) {
      drawLossChart(brainStats.lossHistory);
    }
  }, [brainStats]);

  const loadStats = async () => {
    const convs = await memory.getAllConversations();
    let totalMsgs = 0;
    for (const id of convs) { const msgs = await memory.getMessages(id); totalMsgs += msgs.length; }
    setStats({ conversations: convs.length, messages: totalMsgs });
  };

  const loadBrainStats = async () => {
    try {
      const res = await fetch('/api/brain-stats');
      if (res.ok) setBrainStats(await res.json());
    } catch {}
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadBrainStats()]);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('aillame_admin_token');
    router.push('/admin/login');
  };

  const drawLossChart = useCallback((lossData: { epoch: number; loss: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas || lossData.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const losses = lossData.map(d => d.loss);
    const minL = Math.min(...losses), maxL = Math.max(...losses);
    const range = maxL - minL || 1;
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px monospace';
      ctx.fillText((maxL - (range / 4) * i).toFixed(3), 2, y + 4);
    }
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, 'rgba(99,102,241,0.3)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.beginPath();
    lossData.forEach((d, i) => {
      const x = pad.left + (i / (lossData.length - 1)) * chartW;
      const y = pad.top + chartH - ((d.loss - minL) / range) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + chartW, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(129,140,248,0.9)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    lossData.forEach((d, i) => {
      const x = pad.left + (i / (lossData.length - 1)) * chartW;
      const y = pad.top + chartH - ((d.loss - minL) / range) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    const lastD = lossData[lossData.length - 1];
    const lx = pad.left + chartW;
    const ly = pad.top + chartH - ((lastD.loss - minL) / range) * chartH;
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#818cf8';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  const formatBytes = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;
  const formatUptime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col overflow-hidden">

      <main className="relative z-10 flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">

        {/* ── Control Center Header ── */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <FiShield size={12} className="text-indigo-400" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Secure Admin Workspace</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Control <span className="text-indigo-500">Center</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-slate-500 text-xs font-mono bg-white/[0.03] px-2 py-1 rounded-md border border-white/5">Session: {formatUptime(uptime)}</p>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Live Sync</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="group flex items-center gap-2 px-5 py-3 rounded-2xl glass-card text-slate-400 hover:text-indigo-400 transition-all active:scale-95 border border-white/5"
            >
              <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              <span className="text-xs font-bold uppercase tracking-wider">Veriyi Yenile</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl glass-card text-slate-400 hover:text-rose-400 transition-all active:scale-95 border border-white/5"
            >
              <FiLogOut size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Çıkış</span>
            </button>
          </div>
        </header>

        {/* ── System Health Overview ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {MVP_STATUS.map(({ label, desc, variant }) => (
            <div key={label} className="glass-card rounded-[28px] p-5 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                <FiZap size={80} className="text-indigo-400" />
              </div>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <FiCpu size={14} className="text-slate-400" />
                </div>
                <StatusBadge variant={variant} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{label}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Quick Links Grid ── */}
        <section className="mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {QUICK_LINKS.map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all duration-200 hover:scale-105 hover:shadow-lg group ${color}`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-center leading-tight">{label}</span>
                <FiArrowRight size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Stats + Next Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* Stats */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<FiMessageCircle className="text-indigo-400" />} label="Konuşmalar" value={stats.conversations.toString()} accent="indigo" />
            <StatCard icon={<FiActivity className="text-rose-400" />} label="Mesajlar" value={stats.messages.toString()} accent="rose" />
            <StatCard icon={<FiDatabase className="text-emerald-400" />} label="Eğitim Verisi" value={brainStats ? formatBytes(brainStats.dataSize) : '—'} accent="emerald" />
            <StatCard icon={<FiBox className="text-amber-400" />} label="Epoch" value={brainStats ? brainStats.totalEpochs.toLocaleString() : '—'} accent="amber" />
          </div>

          {/* Next Actions */}
          <div className="glass-card rounded-[24px] p-5 border border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">Sonraki Adımlar</h2>
            <div className="space-y-2.5">
              {NEXT_ACTIONS.map(({ label, note }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-300">{label}</p>
                    <p className="text-[9px] text-gray-600 font-mono">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Loss Chart ── */}
        <div className="glass-card p-6 rounded-[28px] mb-6 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <FiTrendingDown className="text-indigo-400" />
                Eğitim Kayıp Grafiği
              </h2>
              <p className="text-[10px] text-gray-600 mt-0.5 font-mono">Son 50 ölçüm · 5s otomatik güncelleme</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">Mevcut Loss</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-300 font-mono">
                {brainStats?.currentLoss != null ? brainStats.currentLoss.toFixed(4) : '—'}
              </p>
              {brainStats?.bestLoss != null && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">En İyi: {brainStats.bestLoss.toFixed(4)}</p>
              )}
            </div>
          </div>
          {brainStats && brainStats.lossHistory.length > 1 ? (
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full h-44 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            />
          ) : (
            <div className="w-full h-44 rounded-xl bg-white/[0.02] flex items-center justify-center">
              <p className="text-gray-600 text-xs font-mono">Eğitim verisi bekleniyor...</p>
            </div>
          )}
        </div>

        {/* ── Rust Core + System Health ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass-card p-6 rounded-[24px] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-[0.04] pointer-events-none">
              <FiCpu size={80} className="text-indigo-400" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-5 flex items-center gap-2">
              <FiCpu className="text-indigo-400" size={12} />
              Rust Core Durumu
            </h2>
            <div className="space-y-2.5">
              <StatusRow label="Rust Engine" value={brainStats?.rustCoreStatus ?? '—'} ok={brainStats?.rustCoreStatus === 'ready'} />
              <StatusRow label="Checkpoint" value={brainStats?.hasCheckpoint ? 'Mevcut' : 'Yok'} ok={!!brainStats?.hasCheckpoint} />
              <StatusRow label="Son Kayıt" value={brainStats?.checkpointTime ? new Date(brainStats.checkpointTime).toLocaleString('tr-TR') : '—'} ok={!!brainStats?.checkpointTime} />
              <StatusRow label="Vektör Hafıza" value={`${brainStats?.memoryEntries ?? 0} kayıt`} ok={(brainStats?.memoryEntries ?? 0) >= 0} />
              <StatusRow label="Eğitim Satırı" value={brainStats ? `${brainStats.dataLines.toLocaleString()} satır` : '—'} ok={!!brainStats} />
            </div>
          </div>

          <div className="glass-card p-6 rounded-[24px] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-[0.04] pointer-events-none">
              <FiZap size={80} className="text-amber-400" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-5 flex items-center gap-2">
              <FiZap className="text-amber-400" size={12} />
              Sistem Durumu
            </h2>
            <div className="space-y-2.5">
              <StatusRow label="Orkestratör v2" value="Akıllı Yönlendirme Aktif" ok />
              <StatusRow label="AI Lab" value="Session Manager Hazır" ok />
              <StatusRow label="Live Learning" value="Açık" ok />
              <StatusRow label="Vektör RAG" value="Hazır" ok />
              <StatusRow label="NAPI-RS Köprüsü" value="Bağlantı Kuruldu" ok />
              <StatusRow label="Motor Mimarisi" value="TS + Rust Hibrit" ok />
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-6 text-gray-700 text-[9px] font-black tracking-[0.5em] uppercase opacity-40">
        Aillame Intelligence Framework · Control Center v1.2 · 2026
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  const accents: Record<string, string> = {
    indigo:  'bg-indigo-500/8 border-indigo-500/10',
    rose:    'bg-rose-500/8 border-rose-500/10',
    emerald: 'bg-emerald-500/8 border-emerald-500/10',
    amber:   'bg-amber-500/8 border-amber-500/10',
  };
  return (
    <div className={`p-5 rounded-[20px] border transition-all duration-300 hover:-translate-y-1 group ${accents[accent] || 'bg-white/5 border-white/5'}`}>
      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-extrabold mt-0.5 tracking-tight font-mono">{value}</p>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all group">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider group-hover:text-gray-300 transition-colors">{label}</span>
      <div className="flex items-center gap-2">
        {ok ? <FiCheckCircle size={11} className="text-emerald-400 flex-shrink-0" /> : <FiAlertCircle size={11} className="text-amber-400 flex-shrink-0" />}
        <span className="text-xs font-bold text-gray-300 font-mono">{value}</span>
      </div>
    </div>
  );
}
