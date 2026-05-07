'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/ui/StatusBadge';
import { FiRefreshCw, FiArrowRight, FiActivity, FiSearch, FiImage, FiCpu, FiPlus, FiTerminal, FiPause, FiPlay, FiStopCircle, FiX, FiStar, FiMessageSquare, FiTrash2 } from 'react-icons/fi';

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
  const [sessionGoal, setSessionGoal] = useState('research');
  const [maxTurns, setMaxTurns] = useState<number>(5);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['nano']);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [qwenStatus, setQwenStatus] = useState<any>(null);
  const [sdxlStatus, setSdxlStatus] = useState<any>(null);
  const [gemmaStatus, setGemmaStatus] = useState<any>(null);
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [runInFlightSessionId, setRunInFlightSessionId] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('aillame_admin_token');
    setToken(savedToken);
    if (savedToken) {
      fetchSessions(savedToken);
      fetchQwenStatus(savedToken);
      fetchSdxlStatus(savedToken);
      fetchGemmaStatus(savedToken);
      fetchOllamaStatus(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchQwenStatus = async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/model-status/qwen', {
        headers: { 'x-aillame-admin-token': authToken }
      });
      const data = await res.json();
      setQwenStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOllamaStatus = async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/model-status/ollama', {
        headers: { 'x-aillame-admin-token': authToken }
      });
      const data = await res.json();
      setOllamaStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGemmaStatus = async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/model-status/gemma', {
        headers: { 'x-aillame-admin-token': authToken }
      });
      const data = await res.json();
      setGemmaStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSdxlStatus = async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/model-status/sdxl', {
        headers: { 'x-aillame-admin-token': authToken }
      });
      const data = await res.json();
      setSdxlStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

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
          goal: sessionGoal,
          topicMode: 'manual',
          mode: 'training_dataset',
          participants: selectedParticipants,
          maxTurns: maxTurns
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

  const updateStatus = async (id: string, status: string): Promise<boolean> => {
    if (!token) return false;
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
        await refreshSession(id);
        await fetchSessions(token);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const runControlledSession = async (id: string, steps = 3) => {
    if (!token || runInFlightSessionId === id) return;
    setRunInFlightSessionId(id);
    try {
      const res = await fetch(`/api/admin/ai-lab/sessions/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-aillame-admin-token': token
        },
        body: JSON.stringify({ action: 'run_controlled', steps })
      });
      if (res.ok) {
        await refreshSession(id);
        await fetchSessions(token);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunInFlightSessionId(null);
    }
  };

  const startSession = async (id: string) => {
    const started = await updateStatus(id, 'running');
    if (started) {
      void runControlledSession(id, 3);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!token || !confirm('Bu deneyi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/admin/ai-lab/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'x-aillame-admin-token': token }
      });

      if (res.ok) {
        if (selectedSession?.id === id) {
          setSelectedSession(null);
        }
        fetchSessions(token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSession = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/ai-lab/sessions/${id}`, {
        headers: { 'x-aillame-admin-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedSession(data);
        // Update in sessions list too
        setSessions(prev => prev.map(s => s.id === id ? data : s));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (selectedSession?.status === 'running') {
      refreshSession(selectedSession.id);
      interval = setInterval(() => {
        refreshSession(selectedSession.id);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [selectedSession?.id, selectedSession?.status, token]);

  useEffect(() => {
    if (sessionGoal === 'explain') setMaxTurns(4);
    else if (sessionGoal === 'research') setMaxTurns(5);
    else if (sessionGoal === 'create_learning_candidate') setMaxTurns(5);
    else if (sessionGoal === 'debug_error') setMaxTurns(4);
    else if (sessionGoal === 'image_generation_plan') setMaxTurns(4);
    else setMaxTurns(5);
  }, [sessionGoal]);

  const generateRandomTopic = () => {
    const topic = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setNewTopic(topic);
  };

  if (loading) return <div className="p-8 text-[var(--text-main)] bg-[var(--bg-main)] min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <FiActivity className="w-12 h-12 text-indigo-500 animate-pulse" />
      <span className="text-sm font-bold uppercase tracking-widest opacity-50">AI Lab Yükleniyor...</span>
    </div>
  </div>;

  if (!token) return <div className="p-8 text-rose-500 bg-[var(--bg-main)] min-h-screen flex items-center justify-center font-bold italic underline decoration-rose-500/30">
    Access Denied. Admin token required.
  </div>;

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-500">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gradient">Aillame Lab</h1>
            <p className="text-[var(--text-muted)] mt-1 font-medium">
              Model, prompt, Nano, RAG ve provider çıktıları için güvenli deney ve değerlendirme alanı.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge variant="info" label="Experiment / Evaluation" />
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="theme-surface rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] theme-muted">Overview</p>
            <p className="mt-2 text-sm font-semibold theme-secondary">Aillame Lab ana ürün merkezi değil; kontrollü deney ve evaluation yüzeyidir.</p>
          </div>
          <div className="theme-surface rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] theme-muted">Playground</p>
            <p className="mt-2 text-sm font-semibold theme-secondary">Prompt, structured JSON, provider output ve RAG context testleri burada denenir.</p>
          </div>
          <div className="theme-surface rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] theme-muted">Diagnostics</p>
            <p className="mt-2 text-sm font-semibold theme-secondary">LLM / IGM runtime durumları yalnızca diagnostic preview olarak gösterilir.</p>
          </div>
        </section>

        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Create Session Card */}
          <div className="col-span-1 glass-card rounded-3xl p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <FiPlus className="w-4 h-4" />
              </div>
              Yeni Deney Başlat
            </h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Araştırma Konusu</label>
                  <button
                    onClick={generateRandomTopic}
                    className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold uppercase tracking-tight"
                  >
                    Rastgele Üret
                  </button>
                </div>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Örn: Kuantum Teknolojileri..."
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-main)]/50 p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:opacity-30"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Oturum Hedefi (Goal)</label>
                <select
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-main)]/50 p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all appearance-none"
                >
                  <option value="research">Araştırma & Özetleme (Research)</option>
                  <option value="create_learning_candidate">Eğitim Adayı Üretme (Learning Candidate)</option>
                  <option value="explain">Kavram Açıklama (Explain)</option>
                  <option value="compare_models">Model Kıyaslama (Compare)</option>
                  <option value="debug_error">Hata Ayıklama (Debug)</option>
                  <option value="image_generation_plan">Görsel Planlama (Image Plan)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Maksimum Tur (Max Turns)</label>
                <input
                  type="number"
                  min={3} max={12}
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-main)]/50 p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Katılımcı Modeller</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'nano', icon: <FiCpu />, role: 'Advisory / Eval' },
                    { id: 'web_search', icon: <FiSearch />, role: 'Data Collector' },
                    { id: 'gemma', icon: <FiTerminal />, role: 'LLM profile' },
                    { id: 'qwen', icon: <FiCpu />, role: 'LLM/Vision profile' },
                    { id: 'sdxl', icon: <FiImage />, role: 'IGM profile' },
                    { id: 'ollama', icon: <FiActivity />, role: 'Compatibility fallback' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedParticipants(prev =>
                          prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                        );
                      }}
                      className={`rounded-xl px-3 py-2 text-[10px] font-black transition-all border flex items-center gap-2 ${
                        selectedParticipants.includes(p.id)
                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                          : 'bg-[var(--bg-main)]/30 border-[var(--glass-border)] text-[var(--text-muted)] hover:border-indigo-500/30 hover:text-[var(--text-main)]'
                      }`}
                    >
                      {p.icon}
                      <span className="flex flex-col items-start text-left">
                        <span>{p.id.toUpperCase()}</span>
                        <span className="text-[8px] opacity-70 font-medium normal-case">{p.role}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {selectedParticipants.includes('qwen') && (
                  <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-medium italic">
                    Qwen opsiyonel bir evaluation profilidir; Aillame için zorunlu dependency değildir.
                  </div>
                )}
                {selectedParticipants.includes('sdxl') && sessionGoal !== 'image_generation_plan' && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-medium italic">
                    SDXL adı yalnızca compatibility/örnek IGM profili olarak kullanılır; yeni mimari dili IGM runtime ve diffusion worker'dır.
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateSession}
                disabled={!newTopic}
                className="w-full rounded-2xl bg-indigo-600 py-4 font-black text-xs text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                Laboratuvarı Hazırla <FiArrowRight className="inline-block ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          {/* Model Status Card */}
          <div className="col-span-1 lg:col-span-2 glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FiActivity className="text-indigo-400" />
                Lab Runtime & Evaluation
              </h2>
              <StatusBadge variant="info" label="Diagnostic preview" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { name: 'Nano Eval', status: 'ACTIVE', color: 'text-emerald-300', desc: 'Advisory', icon: <FiCpu className="text-emerald-300" /> },
                { name: 'Provider Output', status: 'PREVIEW', color: 'text-cyan-300', desc: 'Compare', icon: <FiSearch className="text-cyan-300" /> },
                { name: 'LLM Profiles', status: 'DIAGNOSTIC', color: 'text-amber-300', desc: 'Compatibility', icon: <FiTerminal className="text-amber-300" /> },
                { name: 'IGM Profiles', status: 'DIAGNOSTIC', color: 'text-amber-300', desc: 'Compatibility', icon: <FiImage className="text-amber-300" /> },
              ].map(m => (
                <div key={m.name} className="theme-surface rounded-2xl p-4 transition-all hover:border-indigo-500/25 group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest group-hover:text-indigo-500 transition-colors">{m.name}</div>
                    {m.icon}
                  </div>
                  <div className={`mt-1 font-black text-xs ${m.color}`}>{m.status}</div>
                  <div className="mt-2 text-[10px] text-[var(--text-muted)] font-bold italic opacity-60 leading-tight">{m.desc}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] font-medium leading-relaxed theme-muted">
              Model yönetimi, API key, release readiness, patch workflow ve document library kendi admin sayfalarında yönetilir. Lab yalnızca güvenli deney ve değerlendirme alanıdır.
            </p>
          </div>        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-5 h-[calc(100vh-180px)]">
          {/* Session List */}
          <div className={`${selectedSession ? 'lg:col-span-2' : 'lg:col-span-5'} transition-all overflow-y-auto custom-scrollbar pr-2`}>
            <h2 className="mb-6 text-xl font-bold flex items-center gap-2">
              Son Deneyler
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black">{sessions.length}</span>
            </h2>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="glass-card rounded-2xl border-dashed p-12 text-center text-[var(--text-muted)] font-bold italic opacity-50">
                  Henüz bir laboratuvar oturumu bulunmuyor.
                </div>
              ) : (
                sessions.map((s: any) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className={`group flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                      selectedSession?.id === s.id
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-xl shadow-indigo-500/10'
                        : 'bg-[var(--bg-surface)]/40 border-[var(--glass-border)] hover:bg-[var(--bg-surface)]/60 hover:border-indigo-500/20'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-black text-sm truncate pr-4 group-hover:text-indigo-500 transition-colors">{s.topic}</div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider">
                        <span className="flex items-center gap-1">#{s.id.split('_').pop()}</span>
                        <span className="flex items-center gap-1 text-emerald-500/80">GOAL: {s.goal || 'RESEARCH'}</span>
                        <span className="flex items-center gap-1 text-indigo-500/70">TUR: {s.currentTurn}/{s.maxTurns}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge
                          variant={s.status === 'running' ? 'running' : s.status === 'completed' ? 'completed' : s.status === 'degraded' || s.status === 'failed' ? 'warning' : 'pending'}
                          label={s.status === 'failed' ? 'DEGRADED' : s.status}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(s.id);
                          }}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                          title="Sil"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details View */}
          {selectedSession ? (
            <div className="lg:col-span-3 glass-card rounded-3xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 shadow-2xl">
              <div className="p-5 border-b border-[var(--glass-border)] bg-[var(--bg-surface)]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <FiActivity className={selectedSession.status === 'running' ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{selectedSession.topic}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">{selectedSession.id}</span>
                      <button
                        onClick={() => refreshSession(selectedSession.id)}
                        className="p-1 rounded-md hover:bg-indigo-500/10 text-indigo-500 transition-colors"
                        title="Yenile"
                      >
                        <FiRefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedSession(null)} className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all active:scale-90">
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6 bg-[var(--bg-main)]/20">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />
                  <div className="px-3 py-1 rounded-full border border-[var(--glass-border)] bg-[var(--bg-surface)] text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Turn {selectedSession.currentTurn} / {selectedSession.maxTurns}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--glass-border)] to-transparent" />
                </div>

                {selectedSession.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 italic py-20">
                    <FiMessageSquare size={32} className="mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest">Henüz mesaj yok. Deneyi başlatın.</p>
                  </div>
                ) : (
                  selectedSession.messages.map((m: any, idx: number) => {
                    const isSystem = m.model === 'system';
                    const isUserLike = m.model === 'nano' || m.model === 'qwen';

                    return (
                      <div key={idx} className={`animate-fade-in ${isSystem ? 'flex justify-center' : ''}`}>
                        {isSystem ? (
                          <div className="px-4 py-2 rounded-full bg-zinc-500/5 border border-dashed border-[var(--glass-border)] text-[10px] text-[var(--text-muted)] font-medium italic">
                            {m.content}
                          </div>
                        ) : (
                          <div className={`max-w-[90%] group`}>
                            <div className="flex items-center gap-2 mb-1.5 px-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                m.model === 'nano' ? 'bg-indigo-500 shadow-[0_0_8px_var(--primary-glow)]' :
                                m.model === 'gemma' ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.3)]' :
                                m.model === 'web_search' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                                m.model === 'qwen' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]' :
                                m.model === 'sdxl' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' :
                                'bg-zinc-500'
                              }`} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{m.model}</span>

                              {/* Execution Mode Badge */}
                              {m.outputType === 'planning' || m.outputType === 'degraded' || m.outputType === 'skipped' ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-tighter border border-amber-500/20">Degraded / Skipped</span>
                              ) : m.outputType === 'error' ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-tighter border border-rose-500/20">Critical Error</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter border border-emerald-500/20">Active Execution</span>
                              )}

                              <span className="text-[8px] font-bold text-[var(--text-muted)] opacity-30 ml-auto">{new Date(m.createdAt).toLocaleTimeString()}</span>
                            </div>

                            <div className={`p-4 rounded-2xl border transition-all duration-300 relative group/msg ${
                              m.model === 'nano' ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-900 dark:text-indigo-100' :
                              m.model === 'gemma' ? 'bg-indigo-500/5 border-indigo-400/20 text-indigo-900 dark:text-indigo-100' :
                              m.model === 'web_search' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-100' :
                              m.model === 'qwen' ? 'bg-purple-500/5 border-purple-500/20 text-purple-900 dark:text-purple-100' :
                              m.model === 'sdxl' ? 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-100' :
                              'bg-[var(--bg-surface)] border-[var(--glass-border)]'
                            }`}>
                              {/* Training Candidate Badge */}
                              {m.candidateForTraining && (
                                <div className="absolute -top-3 -right-2 flex items-center gap-1 bg-indigo-600 text-white px-2 py-1 rounded-lg shadow-xl shadow-indigo-500/40 animate-pulse border border-indigo-400/50">
                                  <FiStar size={10} className="text-yellow-300 fill-yellow-300" />
                                  <span className="text-[8px] font-black uppercase tracking-widest">Admin Onayı Bekliyor</span>
                                </div>
                              )}

                              <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {m.content}
                              </div>

                              {/* Safety Flags */}
                              {m.safetyFlags && m.safetyFlags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {m.safetyFlags.map((f: string, fi: number) => (
                                    <span key={fi} className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase border border-rose-500/20">
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* SDXL Image Rendering */}
                              {(m.imageUrl || m.imagePath) && (
                                <div className="mt-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/5 group-hover:shadow-2xl transition-all">
                                  <img
                                    src={m.imageUrl || `/api/image-generation/view?path=${encodeURIComponent(m.imagePath || '')}`}
                                    alt="Generated"
                                    className="w-full h-auto max-h-[400px] object-contain hover:scale-[1.02] transition-transform duration-700"
                                  />
                                  {m.prompt && (
                                    <div className="p-3 border-t border-[var(--glass-border)] bg-[var(--bg-surface)]/80 backdrop-blur-sm">
                                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 opacity-50">Image Prompt</p>
                                      <p className="text-[11px] text-[var(--text-main)] italic font-medium">"{m.prompt}"</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Web Search Citations Rendering */}
                              {m.citations && (
                                <div className="mt-4 pt-3 border-t border-current opacity-20">
                                  <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-60">Verified Sources:</p>
                                  <div className="flex flex-col gap-1.5">
                                    {m.citations.map((c: string, ci: number) => {
                                      // Simple URL extraction if present in string
                                      const urlMatch = c.match(/\((https?:\/\/[^\)]+)\)/);
                                      const url = urlMatch ? urlMatch[1] : null;
                                      const title = c.replace(/\(https?:\/\/[^\)]+\)/, '').trim();

                                      return (
                                        <div key={ci} className="flex items-start gap-2 group/cite">
                                          <span className="text-[9px] font-black opacity-40 mt-0.5">{ci + 1}.</span>
                                          {url ? (
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] font-bold hover:underline decoration-indigo-500/50 break-all"
                                            >
                                              {title}
                                            </a>
                                          ) : (
                                            <span className="text-[10px] font-medium">{c}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-5 border-t border-[var(--glass-border)] bg-[var(--bg-surface)]/80 backdrop-blur-md flex flex-col gap-3 sticky bottom-0 z-30">
                <div className="flex items-center gap-3">
                  {selectedSession.status === 'draft' || selectedSession.status === 'paused' || selectedSession.status === 'stopped' ? (
                    <button
                      onClick={() => startSession(selectedSession.id)}
                      disabled={runInFlightSessionId === selectedSession.id}
                      className="flex-1 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <FiPlay /> {runInFlightSessionId === selectedSession.id ? 'Başlatılıyor' : 'Deneyi Başlat'}
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
                            refreshSession(selectedSession.id);
                            fetchSessions(token);
                          }
                        }}
                        className="flex-1 rounded-2xl bg-[var(--bg-main)] border border-[var(--glass-border)] text-[var(--text-main)] py-3 text-[10px] font-black hover:bg-[var(--bg-surface)] transition-all flex items-center justify-center gap-2"
                      >
                        <FiArrowRight /> Tek Adım
                      </button>
                      <button
                        onClick={() => runControlledSession(selectedSession.id, 3)}
                        disabled={runInFlightSessionId === selectedSession.id}
                        className="flex-1 rounded-2xl bg-indigo-600 py-3 text-[10px] font-black text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
                      >
                        <FiTerminal /> Kontrollü Döngü (3)
                      </button>
                      <button
                        onClick={() => updateStatus(selectedSession.id, 'paused')}
                        className="px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 py-3 text-[10px] font-black hover:bg-amber-500/20 transition-all"
                      >
                        <FiPause />
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => updateStatus(selectedSession.id, 'stopped')}
                  className="w-full rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-500/60 py-2.5 text-[10px] font-black hover:bg-rose-500/10 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                >
                  <FiStopCircle /> Oturumu Sonlandır
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-3 glass-card rounded-3xl flex flex-col items-center justify-center p-12 text-center opacity-40 animate-pulse">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6">
                <FiActivity size={40} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-[0.2em]">Oturum Seçilmedi</h3>
              <p className="text-sm font-medium mt-3 max-w-xs">Sol taraftaki listeden bir deney seçerek detayları ve model konuşmalarını görüntüleyebilirsiniz.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
