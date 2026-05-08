'use client';

import ChatShell from '@components/ChatShell';
import { useChatState } from '@providers/ChatProvider';
import { FiCpu, FiShield, FiZap } from 'react-icons/fi';

const WORKSPACE_BADGES = [
  { icon: FiCpu,    label: 'Nano Engine',    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { icon: FiShield, label: 'Local Mode',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { icon: FiZap,    label: 'Safe Fallback',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
] as const;

export default function HomePage() {
  const { conversationId } = useChatState();

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col animate-fade-in px-4 pt-8 md:pt-12 pb-8">
        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {WORKSPACE_BADGES.map(({ icon: Icon, label, color }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${color}`}
              >
                <Icon size={10} />
                {label}
              </span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
            <span className="text-gradient">Aillame</span>
            <span className="text-muted font-normal text-2xl ml-3 tracking-normal">Workspace</span>
          </h1>
          <p className="text-muted text-sm mt-2 max-w-lg leading-relaxed">
            Rust + TypeScript tabanlı yerel AI provider. Nano motoru · Güvenli fallback · Provider API.
          </p>
        </header>

        <section
          aria-label="Aillame AI Sohbet Alanı"
          className="glass-card rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-white/5 backdrop-blur-3xl h-[700px] relative z-10"
        >
          {conversationId ? (
            <ChatShell key={conversationId} conversationId={conversationId} />
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 py-20">
              <div className="w-10 h-10 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-indigo-300/40 text-[10px] font-black uppercase tracking-[0.4em]">Workspace Başlatılıyor</p>
            </div>
          )}
        </section>

        <footer className="text-center pt-6">
          <p className="text-muted text-[9px] font-black tracking-[0.5em] uppercase opacity-70">
            Aillame AI Project · Local Edge · Privacy First · 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
