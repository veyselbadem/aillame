'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LocalMemoryStore } from '@providers/memory/local';
import {
  FiActivity,
  FiMessageCircle,
  FiCpu,
  FiLogOut,
  FiDatabase,
  FiRefreshCw,
  FiKey,
  FiClipboard,
  FiBook,
  FiThumbsUp,
  FiShield,
  FiArrowRight,
  FiPackage,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import StatusBadge from '@components/ui/StatusBadge';

const memory = new LocalMemoryStore();

interface BrainStats {
  dataSize: number;
  dataLines: number;
  totalEpochs: number;
  rustCoreStatus: string;
  memoryEntries: number;
}

const QUICK_LINKS = [
  { href: '/admin/model-library',       label: 'Runtime & Modeller', icon: FiPackage,   color: 'text-violet-400 bg-violet-500/10 border-violet-500/15' },
  { href: '/admin/api-clients',         label: 'Provider API',       icon: FiKey,       color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/15' },
  { href: '/admin/agent-tasks',         label: 'Code Agent',         icon: FiClipboard, color: 'text-blue-400 bg-blue-500/10 border-blue-500/15' },
  { href: '/admin/memory-write-queue',  label: 'Hafıza Kuyruğu',     icon: FiDatabase,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/15' },
  { href: '/admin/memory-cards',        label: 'Hafıza Kartları',    icon: FiDatabase,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
  { href: '/admin/research-results',    label: 'Araştırma',          icon: FiBook,      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/15' },
  { href: '/admin/feedback',            label: 'Feedback',           icon: FiThumbsUp,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
] as const;

const FOUNDATION_STATUS = [
  { label: 'Local Text Runtime Foundation', desc: 'GGUF/text runtime ve registry diagnostic yüzeyi hazır.', variant: 'active' as const },
  { label: 'Project Memory', desc: 'Global, project ve session scope ayrımı görünür.', variant: 'review' as const },
  { label: 'External Provider API', desc: '/api/external/v1 ve OpenAI-compatible route hazırlığı.', variant: 'protected' as const },
  { label: 'Code Agent Foundation', desc: 'Plan-only, patch proposal ve approval-gated akış.', variant: 'review' as const },
  { label: 'Nano Diagnostics', desc: 'Advisory decision metadata ve Türkçe diagnostic akışı.', variant: 'active' as const },
  { label: 'Image Workflow', desc: 'Workflow JSON, job queue ve SDXL-like adapter foundation; runtime not configured.', variant: 'disabled' as const },
  { label: 'RAG / Vector Memory', desc: 'Placeholder embedding, in-memory vector store ve document ingestion foundation.', variant: 'review' as const },
  { label: 'Memory Attribution', desc: 'Cevaplarda kaynak/hafıza şeffaflığı için diagnostic attribution yüzeyi.', variant: 'review' as const },
  { label: 'Nano Feedback Loop', desc: 'Feedback doğrudan eğitime gitmez; pending-review candidate olarak tutulur.', variant: 'protected' as const },
  { label: 'Security Hardening', desc: 'API key ve policy sertleştirmesi Faz 5 kapsamındadır.', variant: 'disabled' as const },
];

const RUNTIME_ROWS = [
  { label: 'Text Runtime', value: 'degraded preview', ok: false },
  { label: 'Image Runtime', value: 'disabled', ok: false },
  { label: 'Vision Runtime', value: 'diagnostic only', ok: false },
  { label: 'Embedding Runtime', value: 'planned', ok: false },
  { label: 'Code Runtime', value: 'plan-only', ok: true },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ conversations: 0, messages: 0 });
  const [brainStats, setBrainStats] = useState<BrainStats | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) { router.push('/admin/login'); return; }
    setAuthorized(true);
    loadStats();
    loadBrainStats();
  }, [router]);

  const loadStats = async () => {
    const convs = await memory.getAllConversations();
    let totalMsgs = 0;
    for (const id of convs) {
      const msgs = await memory.getMessages(id);
      totalMsgs += msgs.length;
    }
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

  const formatBytes = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col overflow-hidden">
      <main className="relative z-10 flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <FiShield size={12} className="text-indigo-400" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Aillame Local AI Hub</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Control <span className="text-indigo-500">Center</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Runtime, project memory, external provider ve Code Agent foundation durumunu tek ekranda izleyin.
            </p>
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

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {FOUNDATION_STATUS.map(({ label, desc, variant }) => (
            <div key={label} className="glass-card rounded-[20px] p-5 border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <FiCpu size={14} className="text-slate-400" />
                </div>
                <StatusBadge variant={variant} />
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{label}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<FiMessageCircle className="text-indigo-400" />} label="Konuşmalar" value={stats.conversations.toString()} accent="indigo" />
            <StatCard icon={<FiActivity className="text-rose-400" />} label="Mesajlar" value={stats.messages.toString()} accent="rose" />
            <StatCard icon={<FiDatabase className="text-emerald-400" />} label="Eğitim Verisi" value={brainStats ? formatBytes(brainStats.dataSize) : '-'} accent="emerald" />
            <StatCard icon={<FiCpu className="text-amber-400" />} label="Epoch" value={brainStats ? brainStats.totalEpochs.toLocaleString() : '-'} accent="amber" />
          </div>

          <div className="glass-card p-6 rounded-[24px] border border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-5 flex items-center gap-2">
              <FiCpu className="text-indigo-400" size={12} />
              Runtime Status Preview
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {RUNTIME_ROWS.map((row) => (
                <StatusRow key={row.label} {...row} />
              ))}
              <StatusRow label="Registry Models" value="diagnostic count" ok />
              <StatusRow label="GGUF Readiness" value="not configured until model path is set" ok={false} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[24px] border border-white/5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-4">Project Memory Isolation</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCard title="Global Memory" body="Yalnızca açıkça istenirse ortak bağlam olarak kullanılır." />
            <InfoCard title="Project Memory" body="boss-ai hafızası doomsgame-engine isteklerine otomatik karışmaz." />
            <InfoCard title="Session Memory" body="Geçici konuşma bağlamı proje hafızasından ayrı tutulur." />
          </div>
        </div>
      </main>
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
    <div className={`p-5 rounded-[20px] border transition-all duration-300 group ${accents[accent] || 'bg-white/5 border-white/5'}`}>
      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-lg mb-3">
        {icon}
      </div>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-extrabold mt-0.5 tracking-tight font-mono">{value}</p>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all group">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider group-hover:text-gray-300 transition-colors">{label}</span>
      <div className="flex items-center gap-2">
        {ok ? <FiCheckCircle size={11} className="text-emerald-400 flex-shrink-0" /> : <FiAlertCircle size={11} className="text-amber-400 flex-shrink-0" />}
        <span className="text-xs font-bold text-gray-300 font-mono text-right">{value}</span>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs text-gray-400 leading-relaxed">{body}</p>
    </div>
  );
}
