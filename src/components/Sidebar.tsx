'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LocalMemoryStore } from '@providers/memory/local';
import { useChatState } from '@providers/ChatProvider';
import {
  FiPlus,
  FiMessageSquare,
  FiTrash2,
  FiHome,
  FiBook,
  FiDatabase,
  FiSettings,
  FiShield,
  FiImage,
  FiMenu,
  FiChevronLeft,
  FiCpu,
  FiLayers,
  FiStar,
  FiClipboard,
  FiKey,
  FiLogIn,
  FiLogOut,
  FiThumbsUp,
  FiPackage,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';

const WORKSPACE_NAV = [
  { href: '/',          label: 'Sohbet',         icon: FiHome },
  { href: '/generate',  label: 'Görsel Üretim',  icon: FiImage },
  { href: '/library',   label: 'Kütüphane',      icon: FiBook },
  { href: '/memory',    label: 'Bellek',          icon: FiDatabase },
  { href: '/settings',  label: 'Ayarlar',         icon: FiSettings },
];

const TOOLS_NAV = [
  { href: '/feedback', label: 'Feedback', icon: FiThumbsUp },
];

const ADMIN_NAV_MAIN = [
  { href: '/admin/dashboard',       label: 'Kontrol Merkezi',   icon: FiShield },
  { href: '/admin/model-library',   label: 'Modeller',          icon: FiPackage },
  { href: '/admin/image-assets',    label: 'Görseller',         icon: FiImage },
  { href: '/admin/agent-tasks',     label: 'Dış Görevler',       icon: FiClipboard },
  { href: '/admin/agent',           label: 'Code Agent',          icon: FiCpu },
  { href: '/admin/documents',       label: 'Hafıza / RAG',      icon: FiBook },
  { href: '/admin/api-clients',     label: 'Provider API',      icon: FiKey },
];

const ADMIN_SETTINGS_GROUPS = [
  {
    id: 'runtime',
    label: 'Runtime ve Hazırlık',
    icon: FiCpu,
    items: [
      { href: '/admin/desktop-readiness', label: 'Masaüstü Hazırlığı', icon: FiCpu },
      { href: '/admin/release-candidate', label: 'Yayın Adayı', icon: FiShield },
    ],
  },
  {
    id: 'memory',
    label: 'Hafıza ve Geri Bildirim',
    icon: FiDatabase,
    items: [
      { href: '/admin/memory-cards',        label: 'Hafıza Kartları',   icon: FiLayers },
      { href: '/admin/memory-write-queue',  label: 'Hafıza Kuyruğu',    icon: FiDatabase },
      { href: '/admin/feedback',            label: 'Geri Bildirim',     icon: FiMessageSquare },
    ],
  },
  {
    id: 'intelligence',
    label: 'Lab ve Değerlendirme',
    icon: FiStar,
    items: [
      { href: '/admin/ai-lab',            label: 'Aillame Lab',        icon: FiCpu },
      { href: '/admin/intelligence',      label: 'Nano Eval',          icon: FiStar },
      { href: '/admin/research-results',  label: 'Araştırma Sonuçları', icon: FiBook },
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
    <p className="px-4 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] mb-2 mt-4 first:mt-0">
      {label}
    </p>
  );
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
        active
          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
      }`}
    >
      <Icon
        size={16}
        className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}
      />
      <span className="text-sm font-semibold tracking-wide truncate">{label}</span>
    </Link>
  );
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const router = useRouter();
  const { conversationId, setConversationId, startNewChat } = useChatState();

  useEffect(() => {
    // Auto-open group if active page is inside it
    const activeGroup = ADMIN_SETTINGS_GROUPS.find(g => 
      g.items.some(item => pathname === item.href)
    );
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/') loadHistory();
  }, [conversationId, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsAdmin(Boolean(localStorage.getItem('aillame_admin_token')));
  }, [pathname]);

  const loadHistory = async () => {
    const conversations = await memory.getAllConversations();
    const historyData = await Promise.all(
      conversations.map(async (id) => {
        const msgs = await memory.getMessages(id);
        const title = msgs.length > 0 ? `${msgs[0].content.slice(0, 22)}...` : 'Yeni Sohbet';
        return { id, title };
      })
    );
    setHistory(historyData.reverse());
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bu sohbeti silmek istediğine emin misin?')) {
      await memory.deleteConversation(id);
      loadHistory();
      if (conversationId === id) startNewChat();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('aillame_admin_token');
    setIsAdmin(false);
    router.push('/admin/login');
  };

  return (
    <>
      <aside className={`fixed left-0 top-0 h-full transition-all duration-500 z-50 overflow-hidden ${isOpen ? 'w-64' : 'w-0'}`}>
        <div
          className={`h-full w-64 flex flex-col transition-all duration-500 ${!isOpen && 'opacity-0 pointer-events-none'}`}
          style={{
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--glass-border)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <span className="text-white font-black text-sm">A</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-slate-900 dark:text-white font-black tracking-tight text-base leading-none">Aillame</h2>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Local AI Hub</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300 shadow-xl active:scale-90"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(12px)',
              }}
              title={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              {isOpen ? <FiChevronLeft size={16} /> : <FiMenu size={16} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-0.5">
            <SectionLabel label="Workspace" />
            {WORKSPACE_NAV.map((item) => (
              <NavLink key={item.href} {...item} active={pathname === item.href} />
            ))}

            <SectionLabel label="Araçlar" />
            {TOOLS_NAV.map((item) => (
              <NavLink key={item.href} {...item} active={pathname === item.href} />
            ))}

            {isAdmin ? (
              <>
                <SectionLabel label="Yönetim" />
                <div className="space-y-0.5">
                  {ADMIN_NAV_MAIN.map((item) => (
                    <NavLink key={item.href} {...item} active={pathname === item.href} />
                  ))}
                </div>

                <SectionLabel label="Ayarlar" />
                <div className="space-y-1">
                  {ADMIN_SETTINGS_GROUPS.map((group) => (
                    <div key={group.id} className="space-y-0.5">
                      <button
                        onClick={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                        className={`flex w-full items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
                          openGroups[group.id] ? 'text-slate-900 dark:text-white bg-slate-100/50 dark:bg-white/5' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <group.icon size={16} className="text-slate-400" />
                          <span className="text-sm font-semibold tracking-wide">{group.label}</span>
                        </div>
                        {openGroups[group.id] ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                      </button>
                      
                      {openGroups[group.id] && (
                        <div className="ml-4 pl-2 border-l border-slate-200 dark:border-white/10 space-y-0.5 mt-1 animate-fade-in">
                          {group.items.map((item) => (
                            <NavLink key={item.href} {...item} active={pathname === item.href} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 px-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent transition-all duration-200 group"
                    aria-label="Admin oturumunu kapat"
                  >
                    <FiLogOut size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold tracking-wide">Güvenli Çıkış</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <SectionLabel label="Sistem" />
                <button
                  type="button"
                  onClick={() => router.push('/admin/login')}
                  className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent transition-all duration-200 group"
                >
                  <FiLogIn size={16} className="text-slate-500 dark:text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-sm font-semibold tracking-wide">Yönetici Erişimi</span>
                </button>
              </>
            )}

            {pathname === '/' && (
              <div className="mt-4">
                <SectionLabel label="Geçmiş" />
                <button
                  onClick={startNewChat}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all mb-3 group active:scale-95"
                >
                  <FiPlus size={15} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span className="font-semibold text-sm">Yeni Sohbet</span>
                </button>

                <div className="space-y-1">
                  {history.length === 0 ? (
                    <div className="text-center py-6 opacity-30">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Henüz sohbet yok</p>
                    </div>
                  ) : (
                    history.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => setConversationId(chat.id)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                          conversationId === chat.id
                            ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300'
                            : 'hover:bg-slate-100 dark:hover:bg-white/5 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FiMessageSquare
                            size={13}
                            className={`${conversationId === chat.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'} shrink-0`}
                          />
                          <span className="text-xs font-semibold truncate">{chat.title}</span>
                        </div>
                        <button
                          onClick={(e) => deleteChat(e, chat.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-rose-400 transition-all hover:bg-rose-500/10 rounded-lg flex-shrink-0"
                          title="Sohbeti sil"
                          aria-label="Sohbeti sil"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="text-[9px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">Local AI Hub Active</span>
            </div>
            <p className="text-[8px] font-black tracking-[0.3em] text-slate-500 dark:text-slate-500 uppercase mt-1">AILLAME PROJECT v1.3</p>
          </div>
        </div>
      </aside>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Menüyü aç"
          className="fixed top-4 left-4 z-[60] w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300 shadow-xl active:scale-90"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(12px)',
          }}
          title="Menüyü aç"
        >
          <FiMenu size={16} />
        </button>
      )}
    </>
  );
}
