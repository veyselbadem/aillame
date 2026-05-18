'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LocalMemoryStore } from '@providers/memory/local';
import { useChatState } from '@providers/ChatProvider';
import { safeConfirm } from '@/lib/confirm';
import {
  FiActivity,
  FiBook,
  FiClipboard,
  FiCpu,
  FiDatabase,
  FiFolder,
  FiImage,
  FiKey,
  FiLayers,
  FiMenu,
  FiMessageSquare,
  FiPackage,
  FiPlus,
  FiSearch,
  FiSettings,
  FiShield,
  FiStar,
  FiTrash2,
} from 'react-icons/fi';

const WORKSPACE_NAV = [
  { href: '/', label: 'Yeni Sohbet', icon: FiPlus },
  { href: '/projects', label: 'Projeler', icon: FiFolder },
  { href: '/generate', label: 'Görseller', icon: FiImage },
  { href: '/library', label: 'Kütüphane', icon: FiBook },
  {
    href: '/ai-lab',
    label: 'AI Lab',
    icon: FiCpu,
    title: 'Damıtma ve yerel AI eğitim merkezi',
  },
];

const ADMIN_SETTINGS_GROUPS = [
  {
    id: 'runtime',
    label: 'Runtime & Sistem',
    icon: FiActivity,
    items: [
      { href: '/admin/desktop-readiness', label: 'Masaüstü Hazırlığı', icon: FiCpu },
      { href: '/admin/release-candidate', label: 'Yayın Adayı', icon: FiShield },
      { href: '/admin/api-clients', label: 'Sağlayıcı API', icon: FiKey },
      { href: '/admin/agent-tasks', label: 'Dış Görevler', icon: FiClipboard },
    ],
  },
  {
    id: 'intelligence',
    label: 'Lab & Geliştirici',
    icon: FiStar,
    items: [
      { href: '/admin/ai-lab', label: 'Nano Lab', icon: FiCpu },
      { href: '/admin/intelligence', label: 'Nano Eval', icon: FiStar },
      { href: '/admin/research-results', label: 'Araştırma Sonuçları', icon: FiBook },
      { href: '/admin/memory-cards', label: 'Hafıza Kartları', icon: FiLayers },
      { href: '/admin/feedback', label: 'Geri Bildirimler', icon: FiMessageSquare },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const memory = new LocalMemoryStore();

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 mt-4 px-4 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 first:mt-0 dark:text-slate-400">
      {label}
    </p>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  title,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={title}
      className={`group relative flex items-center space-x-3 rounded-xl border px-4 py-2.5 transition-all duration-200 ${
        active
          ? 'active-sidebar-item'
          : 'border-transparent text-zinc-600 hover:border-purple-200/70 hover:bg-purple-50/70 hover:text-zinc-950 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
    >
      <Icon
        size={18}
        className={
          active
            ? 'text-purple-600 dark:text-white'
            : 'text-zinc-500 group-hover:text-purple-500 dark:text-slate-500 dark:group-hover:text-slate-300'
        }
      />
      <span className="truncate text-sm font-semibold tracking-wide">{label}</span>
    </Link>
  );
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const { conversationId, setConversationId, startNewChat } = useChatState();

  useEffect(() => {
    if (pathname === '/') {
      loadHistory();
    }
  }, [conversationId, pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(Boolean(localStorage.getItem('aillame_admin_token')));
    }
  }, [pathname]);

  const loadHistory = async () => {
    const conversations = await memory.getAllConversations();
    const historyData = await Promise.all(
      conversations.map(async (id) => {
        const msgs = await memory.getMessages(id);
        const title = msgs.length > 0 ? `${msgs[0].content.slice(0, 22)}...` : 'Yeni Sohbet';
        return { id, title };
      }),
    );
    setHistory(historyData.reverse());
  };

  const deleteChat = async (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (await safeConfirm('Bu sohbeti silmek istediğine emin misin?', { title: 'Sohbeti Sil' })) {
      await memory.deleteConversation(id);
      loadHistory();
      if (conversationId === id) startNewChat();
    }
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-[10001] h-full overflow-hidden transition-all duration-500 ${
          isOpen ? 'w-[316px] p-2' : 'w-0 p-0'
        }`}
      >
        <div className="relative z-20 flex h-full w-[300px] flex-col overflow-hidden rounded-[18px] border border-zinc-300/60 bg-[#fffdf7]/90 shadow-[0_18px_70px_rgba(75,63,42,0.12)] backdrop-blur-xl transition-all duration-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-[0_18px_70px_rgba(0,0,0,0.38)]">
          <div className="flex items-center gap-2 px-4 py-6">
            <div className="group relative flex-1">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-indigo-500 dark:text-slate-500 dark:group-focus-within:text-indigo-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Arama"
                className="w-full rounded-xl border border-zinc-300/70 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-zinc-800 outline-none transition-all placeholder:text-zinc-500 focus:border-indigo-400/60 dark:border-white/10 dark:bg-[#111827]/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/50"
              />
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Sidebar'ı kapat"
              title="Sidebar'ı kapat"
              className="relative z-[10000] flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/70 text-zinc-600 transition-all hover:bg-purple-50 hover:text-zinc-950 dark:border-white/10 dark:bg-[#111827]/50 dark:text-slate-400 dark:hover:bg-[#111827] dark:hover:text-white"
            >
              <FiMenu size={20} />
            </button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-3 custom-scrollbar">
            <SectionLabel label="Kategoriler" />
            {WORKSPACE_NAV.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onClick={item.href === '/' ? startNewChat : undefined}
              />
            ))}

            {isAdmin && (
              <div className="mt-5">
                <SectionLabel label="Yönetim" />
                {ADMIN_SETTINGS_GROUPS.map((group) => (
                  <div key={group.id} className="space-y-1">
                    {group.items.slice(0, 2).map((item) => (
                      <NavLink
                        key={item.href}
                        {...item}
                        active={pathname === item.href}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <SectionLabel label="Geçmiş Sohbetler" />
              <div className="mt-4 space-y-1">
                {history.length > 0 ? (
                  history.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setConversationId(chat.id)}
                      className={`group/item flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 ${
                        conversationId === chat.id
                          ? 'bg-purple-100/70 text-zinc-950 dark:bg-white/5 dark:text-white'
                          : 'text-zinc-600 hover:bg-purple-50/70 hover:text-zinc-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                        <FiMessageSquare size={16} className="shrink-0 text-zinc-500 dark:text-slate-500" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-semibold">{chat.title}</span>
                          <span className="text-[10px] text-zinc-500 dark:text-slate-600">Bugün</span>
                        </div>
                      </div>
                      <button
                        onClick={(event) => deleteChat(event, chat.id)}
                        className="flex-shrink-0 rounded-lg p-1.5 opacity-0 transition-all hover:text-rose-500 group-hover/item:opacity-100 dark:hover:text-rose-400"
                        title="Sil"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-[11px] font-medium italic text-zinc-500 dark:text-slate-600">
                    Henüz sohbet yok.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t border-zinc-300/50 p-3 dark:border-white/5">
            <Link
              href="/settings"
              className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-zinc-600 transition-all hover:bg-purple-50/70 hover:text-zinc-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <FiSettings
                size={18}
                className="text-zinc-500 group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-400"
              />
              <span className="text-sm font-semibold">Ayarlar</span>
            </Link>
          </div>
        </div>
      </aside>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Sidebar'ı aç"
          title="Sidebar'ı aç"
          className="fixed left-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 shadow-xl transition-all duration-300 hover:text-slate-900 active:scale-90 dark:text-slate-400 dark:hover:text-white"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <FiMenu size={16} />
        </button>
      )}
    </>
  );
}
