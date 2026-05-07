'use client';

import { useEffect, useState } from 'react';
import { LocalMemoryStore } from '@providers/memory/local';
import { FiDatabase, FiTrash2, FiMessageSquare, FiClock, FiAlertTriangle, FiLayers } from 'react-icons/fi';

interface ConversationEntry {
  id: string;
  firstMessage: string;
  messageCount: number;
  lastActivity: number;
}

const memory = new LocalMemoryStore();

const MEMORY_SCOPES = [
  { title: 'Global Memory', body: 'Ortak hafıza yalnızca açıkça istenirse kullanılır.', status: 'guarded' },
  { title: 'Project Memory', body: 'ProjectId bazlı kayıtlar diğer projelere otomatik karışmaz.', status: 'default' },
  { title: 'Session Memory', body: 'Geçici konuşma bağlamı yerel oturum içinde tutulur.', status: 'local' },
] as const;

export default function MemoryPage() {
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadMemory = async () => {
    setLoading(true);
    try {
      const convs = await memory.listConversations();
      const entries: ConversationEntry[] = await Promise.all(
        convs.map(async (conv) => {
          const msgs = await memory.getMessages(conv.id);
          return {
            id: conv.id,
            firstMessage: conv.firstMessage?.content?.slice(0, 80) ?? 'Yeni Sohbet',
            messageCount: msgs.length,
            lastActivity: msgs.length > 0 ? msgs[msgs.length - 1].createdAt : Number(conv.id),
          };
        })
      );
      setConversations(entries);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu sohbeti hafızadan silmek istiyor musun?')) return;
    await memory.deleteConversation(id);
    loadMemory();
  };

  const handleClearAll = async () => {
    if (!confirm('Tüm tarayıcı sohbet hafızası silinecek. Emin misin?')) return;
    setClearing(true);
    for (const conv of conversations) {
      await memory.deleteConversation(conv.id);
    }
    setClearing(false);
    loadMemory();
  };

  const totalMessages = conversations.reduce((s, c) => s + c.messageCount, 0);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col animate-fade-in px-4 pt-8 md:pt-12 pb-8">
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              <FiDatabase size={10} />
              Local IndexedDB
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <FiLayers size={10} />
              Project Isolation
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
                <span className="text-gradient">Bellek</span>
                <span className="text-gray-600 font-normal text-2xl ml-3 tracking-normal">Yönetimi</span>
              </h1>
              <p className="text-gray-500 text-sm mt-2 max-w-2xl leading-relaxed">
                Yerel sohbet hafızasını ve global/project/session ayrımını görüntüleyin. BOSS AI hafızası Doomsgame Engine isteklerinde otomatik kullanılmaz.
              </p>
            </div>
            {conversations.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-rose-400 border border-rose-500/20 bg-rose-500/[0.06] hover:bg-rose-500/[0.12] transition-all text-sm font-bold flex-shrink-0 disabled:opacity-50"
              >
                <FiTrash2 size={14} />
                {clearing ? 'Temizleniyor...' : 'Tümünü Temizle'}
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {MEMORY_SCOPES.map((scope) => (
            <div key={scope.title} className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{scope.title}</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold text-gray-400">{scope.status}</span>
              </div>
              <p className="mt-2 text-xs text-gray-400 leading-relaxed">{scope.body}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Sohbet Sayısı', value: conversations.length, icon: FiMessageSquare, color: 'text-indigo-400' },
            { label: 'Toplam Mesaj', value: totalMessages, icon: FiDatabase, color: 'text-purple-400' },
            { label: 'Depolama', value: 'IndexedDB', icon: FiClock, color: 'text-emerald-400', isText: true },
          ].map(({ label, value, icon: Icon, color, isText }) => (
            <div key={label} className="glass-card rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon size={14} className={color} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</span>
              </div>
              <span className={`text-2xl font-black ${isText ? 'text-sm text-gray-400 mt-1' : color}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-[24px] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-60">
              <FiDatabase size={40} className="text-gray-600" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">Bu proje için henüz hafıza kaydı yok.</p>
              <p className="text-gray-600 text-xs">Yeni sohbetler session memory olarak yerel tarayıcıda tutulur.</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600">Sohbet</span>
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 hidden sm:block">Scope</span>
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 hidden md:block">Son Aktivite</span>
                <span className="w-8" />
              </div>

              <div className="divide-y divide-white/[0.03]">
                {conversations.map((conv) => (
                  <div key={conv.id} className="px-5 py-4 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center hover:bg-white/[0.02] transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <FiMessageSquare size={13} className="text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-200 truncate">{conv.firstMessage}</p>
                        <p className="text-[10px] text-gray-600 font-mono mt-0.5">projectId: general · sourceApp: aillame-ui · ID: {conv.id}</p>
                      </div>
                    </div>

                    <span className="hidden sm:inline-flex rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      session
                    </span>

                    <div className="hidden md:block text-[11px] text-gray-600 font-mono">
                      {formatDate(conv.lastActivity)}
                    </div>

                    <button
                      onClick={() => handleDelete(conv.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      title="Sil"
                      aria-label="Sohbeti sil"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.05]">
          <FiAlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-400/70 font-medium">
            Secret, token, key ve credential içerikleri otomatik hafızaya alınmamalıdır. Project memory yazımı onay ve guard katmanlarından geçmelidir.
          </p>
        </div>
      </div>
    </div>
  );
}
