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

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-indigo-300/40 text-[10px] font-black uppercase tracking-[0.4em]">Workspace Başlatılıyor</p>
      </div>
    );
  }

  return <ChatShell conversationId={conversationId} />;
}
