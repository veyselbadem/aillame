'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/ui/StatusBadge';

const RANDOM_TOPICS = [
  'Kuantum Bilgisayarların Geleceği',
  'Yapay Zeka Etiği ve Regülasyonlar',
  'Mars Kolonizasyonu: Teknik Zorluklar',
  'Web3 ve Merkeziyetsiz Finansın Etkisi',
  'Yenilenebilir Enerji Depolama Çözümleri',
  'Biyoteknolojide CRISPR Devrimi',
  'Otonom Araçların Şehir Planlamasına Etkisi',
  'Metaverse ve Sosyal Etkileşimin Dönüşümü'
];

export default function AiLabPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  
  const [newTopic, setNewTopic] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['nano']);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('aillame_admin_token');
    setToken(savedToken);
    if (savedToken) {
      fetchSessions(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchSessions = async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/ai-lab/sessions', {
        headers: { 'x-aillame-admin-token': authToken }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!token || !newTopic) return;
    
    try {
      const res = await fetch('/api/admin/ai-lab/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-aillame-admin-token': token 
        },
        body: JSON.stringify({
          topic: newTopic,
          topicMode: 'manual',
          mode: 'training_dataset',
          participants: selectedParticipants,
          maxTurns: 10
        })
      });

      if (res.ok) {
        setNewTopic('');
        fetchSessions(token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/ai-lab/sessions/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-aillame-admin-token': token 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchSessions(token);
        if (selectedSession?.id === id) {
          setSelectedSession((prev: any) => ({ ...prev, status }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateRandomTopic = () => {
    const topic = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setNewTopic(topic);
  };

  if (loading) return <div className="p-8 text-white bg-[#0a0a0a] min-h-screen">Loading AI Lab...</div>;
  if (!token) return <div className="p-8 text-red-500 bg-[#0a0a0a] min-h-screen font-bold">Access Denied. Admin token required.</div>;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">AI Laboratory</h1>
            <p className="text-zinc-400 mt-1">Modeller arası orkestrasyon ve kontrollü eğitim ortamı.</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge variant="protected" label="MVP v1.2" />
          </div>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Create Session Card */}
          <div className="col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md shadow-2xl shadow-blue-500/5">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Yeni Deney Başlat
            </h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Araştırma Konusu</label>
                  <button 
                    onClick={generateRandomTopic}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase"
                  >
                    Rastgele Üret
                  </button>
                </div>
                <input 
                  type="text" 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Örn: Yapay Zeka Etiği..."
                  className="w-full rounded-xl border border-zinc-700 bg-black/60 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-xs font-bold text-zinc-500 uppercase tracking-widest">Katılımcı Modeller</label>
                <div className="flex flex-wrap gap-2">
                  {['nano', 'qwen', 'sdxl', 'gemini', 'web_search'].map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        setSelectedParticipants(prev => 
                          prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                        );
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                        selectedParticipants.includes(p) 
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/10' 
                          : 'bg-zinc-800/40 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleCreateSession}
                disabled={!newTopic}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-bold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Laboratuvarı Hazırla
              </button>
            </div>
          </div>

          {/* Model Status Card */}
          <div className="col-span-1 lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md">
            <h2 className="mb-4 text-xl font-semibold">Orkestrasyon Durumu</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {[
                { name: 'Nano', status: 'AKTİF', color: 'text-emerald-400', desc: 'Yerel Çekirdek' },
                { name: 'Qwen', status: 'PLANLANIYOR', color: 'text-blue-400', desc: 'Pro Analiz' },
                { name: 'SDXL', status: 'PLANLANIYOR', color: 'text-purple-400', desc: 'Görsel Üretim' },
                { name: 'Gemini', status: 'BAĞLI DEĞİL', color: 'text-zinc-600', desc: 'Üst Akıl' },
                { name: 'Web Search', status: 'HAZIR', color: 'text-orange-400', desc: 'Canlı Araştırma' },
                { name: 'AI Lab', status: 'AKTİF', color: 'text-indigo-400', desc: 'Oturum Yöneticisi' },
              ].map(m => (
                <div key={m.name} className="rounded-2xl border border-zinc-800 bg-black/40 p-4 transition-all hover:border-zinc-700 group">
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-zinc-400">{m.name}</div>
                  <div className={`mt-1 font-bold text-sm ${m.color}`}>{m.status}</div>
                  <div className="mt-2 text-[10px] text-zinc-600 font-medium italic">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Session List */}
          <div className={`${selectedSession ? 'lg:col-span-2' : 'lg:col-span-5'} transition-all`}>
            <h2 className="mb-6 text-2xl font-semibold">Son Deneyler</h2>
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-600 font-medium italic">
                  Henüz bir laboratuvar oturumu bulunmuyor.
                </div>
              ) : (
                sessions.map((s: any) => (
                  <div 
                    key={s.id} 
                    onClick={() => setSelectedSession(s)}
                    className={`group flex items-center justify-between rounded-2xl border p-5 cursor-pointer transition-all ${
                      selectedSession?.id === s.id 
                        ? 'bg-blue-600/5 border-blue-500/50 shadow-lg shadow-blue-500/5' 
                        : 'bg-zinc-900/20 border-zinc-800 hover:bg-zinc-900/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-base truncate pr-4">{s.topic}</div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-zinc-600" /> {s.id}</span>
                        <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-zinc-600" /> {s.mode}</span>
                        <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-zinc-600" /> TUR: {s.currentTurn}/{s.maxTurns}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <StatusBadge 
                        variant={s.status === 'running' ? 'running' : s.status === 'completed' ? 'completed' : 'pending'} 
                        label={s.status} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details View */}
          {selectedSession && (
            <div className="lg:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selectedSession.topic}</h3>
                  <p className="text-xs text-zinc-500 mt-1">Oturum Detayları ve Kontrol</p>
                </div>
                <button onClick={() => setSelectedSession(null)} className="text-zinc-500 hover:text-white transition-colors">
                  Kapat
                </button>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 max-h-[500px]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-2 py-1 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                    TURN: {selectedSession.currentTurn} / {selectedSession.maxTurns}
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider ${
                    selectedSession.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {selectedSession.status}
                  </div>
                  {selectedSession.errorCount > 0 && (
                    <div className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 text-[10px] font-mono">
                      ERRS: {selectedSession.errorCount}
                    </div>
                  )}
                </div>

                {selectedSession.messages.map((m: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-2xl border ${
                    m.model === 'system' ? 'bg-zinc-800/20 border-zinc-800 text-zinc-400 italic text-xs' : 
                    m.model === 'nano' ? 'bg-indigo-500/10 border-indigo-500/20 shadow-sm' :
                    m.model === 'web_search' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-sm' :
                    m.model === 'qwen' ? 'bg-purple-500/10 border-purple-500/20 shadow-sm' :
                    m.model === 'sdxl' ? 'bg-amber-500/10 border-amber-500/20 shadow-sm' :
                    'bg-zinc-900 border-zinc-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          m.model === 'nano' ? 'bg-indigo-500' :
                          m.model === 'web_search' ? 'bg-emerald-500' :
                          m.model === 'qwen' ? 'bg-purple-500' :
                          m.model === 'sdxl' ? 'bg-amber-500' :
                          'bg-zinc-500'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{m.model}</span>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500">{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>

                    {/* Image Preview */}
                    {(m.imageUrl || m.imagePath) && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-white/5 bg-black/20">
                        <img 
                          src={m.imageUrl || `/api/image-generation/view?path=${encodeURIComponent(m.imagePath || '')}`} 
                          alt="Generated" 
                          className="w-full h-auto max-h-[300px] object-contain"
                        />
                        {m.prompt && (
                          <div className="p-3 border-t border-white/5 bg-black/40">
                            <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">PROMPT</p>
                            <p className="text-[11px] text-zinc-400 italic">"{m.prompt}"</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Citations / Sources */}
                    {m.citations && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/50">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {m.citations.map((c: string, ci: number) => (
                            <span key={ci} className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-mono text-zinc-400 border border-zinc-700/50">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/40 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {selectedSession.status === 'draft' || selectedSession.status === 'paused' || selectedSession.status === 'stopped' ? (
                    <button 
                      onClick={() => updateStatus(selectedSession.id, 'running')}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold hover:bg-emerald-500 transition-all"
                    >
                      Başlat / Devam Et
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={async () => {
                          if (!token) return;
                          const res = await fetch(`/api/admin/ai-lab/sessions/${selectedSession.id}`, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'x-aillame-admin-token': token 
                            },
                            body: JSON.stringify({ action: 'step' })
                          });
                          if (res.ok) {
                            const updated = await fetch(`/api/admin/ai-lab/sessions/${selectedSession.id}`, {
                              headers: { 'x-aillame-admin-token': token }
                            });
                            if (updated.ok) setSelectedSession(await updated.json());
                            fetchSessions(token);
                          }
                        }}
                        className="flex-1 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 py-2.5 text-[10px] font-bold hover:bg-blue-500/20 transition-all"
                      >
                        Tek Adım
                      </button>
                      <button 
                        onClick={async () => {
                          if (!token) return;
                          const res = await fetch(`/api/admin/ai-lab/sessions/${selectedSession.id}`, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'x-aillame-admin-token': token 
                            },
                            body: JSON.stringify({ action: 'run_controlled', steps: 3 })
                          });
                          if (res.ok) {
                            const updated = await fetch(`/api/admin/ai-lab/sessions/${selectedSession.id}`, {
                              headers: { 'x-aillame-admin-token': token }
                            });
                            if (updated.ok) setSelectedSession(await updated.json());
                            fetchSessions(token);
                          }
                        }}
                        className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[10px] font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                      >
                        Kontrollü Çalıştır
                      </button>
                      <button 
                        onClick={() => updateStatus(selectedSession.id, 'paused')}
                        className="px-4 rounded-xl bg-amber-600 py-2.5 text-[10px] font-bold hover:bg-amber-500 transition-all"
                      >
                        Duraklat
                      </button>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => updateStatus(selectedSession.id, 'stopped')}
                  className="w-full rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 py-2 text-[10px] font-bold hover:bg-rose-500/20 transition-all"
                >
                  Durdur
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
