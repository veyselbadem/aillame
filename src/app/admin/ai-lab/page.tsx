'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/ui/StatusBadge';
import { safeConfirm } from '@/lib/confirm';
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

type LabSessionStatus = 'draft' | 'running' | 'completed' | 'degraded' | 'failed' | 'paused' | 'stopped' | string;

interface LabMessage {
  model: string;
  content: string;
  createdAt: string;
  outputType?: 'planning' | 'degraded' | 'skipped' | 'error' | string;
  candidateForTraining?: boolean;
  generationMetadata?: {
    deviceDetails?: string;
    performanceWarning?: boolean;
  };
  safetyFlags?: string[];
  imageUrl?: string;
  prompt?: string;
  citations?: string[];
}

interface LabSession {
  id: string;
  topic: string;
  goal?: string;
  status: LabSessionStatus;
  currentTurn: number;
  maxTurns: number;
  messages: LabMessage[];
}

interface LabReadiness {
  overallFinalAcceptanceReady?: boolean;
}

function formatMb(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Ölçülemedi';
  return `${value.toLocaleString('tr-TR')} MB`;
}

function formatBinaryStatus(ok: boolean | undefined, positive = 'Hazır', negative = 'Eksik') {
  if (ok === undefined) return 'Bilinmiyor';
  return ok ? positive : negative;
}

function formatGpuLockOwner(owner?: string | null) {
  const labels: Record<string, string> = {
    'qwen-vlm': 'Qwen3-VL 4B görsel anlama',
    'sdxl-turbo': 'SDXL Turbo görsel üretim',
    'nano-training': 'Aillame Nano eğitim',
  };
  return owner ? labels[owner] || owner : 'Yok';
}

function getGpuLockMessage(lock?: { locked?: boolean; message?: string } | null) {
  if (!lock?.locked) return 'Ağır GPU işlemi yok.';
  return lock.message || 'Başka bir ağır GPU işlemi devam ediyor.';
}

function getToneClass(tone: 'ready' | 'warning' | 'danger' | 'muted') {
  const tones = {
    ready: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    muted: 'bg-zinc-500/10 text-[var(--text-muted)] border-[var(--glass-border)]',
  };
  return tones[tone];
}

function StatusChip({ label, tone = 'muted' }: { label: string; tone?: 'ready' | 'warning' | 'danger' | 'muted' }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getToneClass(tone)}`}>
      {label}
    </span>
  );
}

function formatLabStatus(status: string) {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    running: 'Çalışıyor',
    completed: 'Tamamlandı',
    degraded: 'Kısıtlı',
    failed: 'Kısıtlı',
    paused: 'Duraklatıldı',
    stopped: 'Durduruldu',
  };
  return labels[status] || status;
}

export default function AiLabPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const [newTopic, setNewTopic] = useState('');
  const [sessionGoal, setSessionGoal] = useState('research');
  const [maxTurns, setMaxTurns] = useState<number>(5);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['nano']);
  const [selectedSession, setSelectedSession] = useState<LabSession | null>(null);
  const [runInFlightSessionId, setRunInFlightSessionId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<LabReadiness | null>(null);

  const [visionHealthData, setVisionHealthData] = useState<any>(null);
  const [loadingVision, setLoadingVision] = useState(false);
  const [imageGenerationHealthData, setImageGenerationHealthData] = useState<any>(null);
  const [activeModelsData, setActiveModelsData] = useState<any>(null);
  const [loadingImageHealth, setLoadingImageHealth] = useState(false);

  const checkVisionHealth = async () => {
    setLoadingVision(true);
    try {
      const res = await fetch('/api/aillame/vision/health');
      if (res.ok) {
        const data = await res.json();
        setVisionHealthData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVision(false);
    }
  };

  const checkImageGenerationHealth = async () => {
    setLoadingImageHealth(true);
    try {
      const [healthRes, activeRes] = await Promise.all([
        fetch('/api/aillame/image-generation/health'),
        fetch('/api/models/active')
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setImageGenerationHealthData(healthData);
      }

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveModelsData(activeData);
      }
    } catch (e) {
      console.error(e);
      setImageGenerationHealthData({
        ok: false,
        runtime: { enabled: false, cpuFallbackAllowed: false, message: 'Görsel üretim sağlık bilgisi alınamadı.' },
        safeRuntime: {
          ok: false,
          errors: ['Görsel üretim sağlık bilgisi alınamadı.'],
          warnings: [],
        },
      });
    } finally {
      setLoadingImageHealth(false);
    }
  };

  const [miniTestData, setMiniTestData] = useState<any>(null);
  const [loadingMiniTest, setLoadingMiniTest] = useState(false);

  const runMiniTest = async () => {
    setLoadingMiniTest(true);
    setMiniTestData(null);
    try {
      const res = await fetch('/api/aillame/vision/mini-test', {
        method: 'POST'
      });
      const data = await res.json();
      setMiniTestData(data);
    } catch (e: any) {
      setMiniTestData({ ok: false, message: e.message || "Bilinmeyen bir ağ hatası oluştu." });
    } finally {
      setLoadingMiniTest(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('aillame_admin_token');
    setToken(savedToken);
    if (savedToken) {
      fetchSessions(savedToken);
      fetchReadiness(savedToken);
    } else {
      setLoading(false);
    }
    void checkVisionHealth();
    void checkImageGenerationHealth();
  }, []);

  const fetchReadiness = async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/ai-lab/readiness', {
        headers: { 'x-aillame-admin-token': authToken }
      });
      const data = await res.json();
      if (data.success) setReadiness(data.report);
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
    if (!token || !await safeConfirm('Bu deneyi silmek istediğinize emin misiniz?', { title: 'Deneyi Sil' })) return;

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

  const imageSafeRuntime = imageGenerationHealthData?.safeRuntime;
  const imageRuntime = imageGenerationHealthData?.runtime;
  const imageFiles = imageGenerationHealthData?.files;
  const visionGpuLock = visionHealthData?.gpuHeavyLock;
  const imageGpuLock = imageGenerationHealthData?.gpuHeavyLock;
  const activeImageModelId = activeModelsData?.activeImageModelId || activeModelsData?.imageModel?.id;
  const sdxlFilesReady = imageFiles
    ? Boolean(imageFiles.diffusersExists && imageFiles.safetensorsExists)
    : undefined;
  const ramReady = imageSafeRuntime?.errors
    ? !imageSafeRuntime.errors.some((error: string) => error.toLowerCase().includes('ram yetersiz'))
    : undefined;
  const vramReady = imageSafeRuntime?.errors
    ? !imageSafeRuntime.errors.some((error: string) => error.toLowerCase().includes('gpu belleği yetersiz'))
    : undefined;
  const runtimeEnabled = imageRuntime?.enabled === true;
  const imagePreflightOk = imageSafeRuntime?.ok === true;
  const imageCardTone: 'ready' | 'warning' | 'danger' | 'muted' =
    sdxlFilesReady === undefined ? 'muted' : !sdxlFilesReady ? 'danger' : runtimeEnabled && imagePreflightOk ? 'ready' : 'warning';

  if (loading) return <div className="p-8 text-[var(--text-main)] bg-[var(--bg-main)] min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <FiActivity className="w-12 h-12 text-indigo-500 animate-pulse" />
      <span className="text-sm font-bold uppercase tracking-widest opacity-50">Nano Lab yükleniyor...</span>
    </div>
  </div>;

  if (!token) return <div className="p-8 text-rose-500 bg-[var(--bg-main)] min-h-screen flex items-center justify-center font-bold italic underline decoration-rose-500/30">
    Erişim Engellendi. Yönetici token'ı gereklidir.
  </div>;

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-500">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gradient">Nano Lab</h1>
            <p className="text-[var(--text-muted)] mt-1 font-medium">
              Hızlı testleri, uyumluluk kontrollerini ve küçük deneyleri yönetin.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge variant="info" label="Deney / Değerlendirme" />
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-black uppercase tracking-[0.18em] text-[10px]">Deney Alanı</p>
          <p className="mt-1 font-medium">
            Tema uyumluluğu, cihaz/ekran uyumluluğu, performans testleri ve küçük sistem kontrolleri bu alanda izlenir.
          </p>
        </section>

        <section className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="theme-surface rounded-2xl p-4 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] theme-muted">Yerel Hazırlık</p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${readiness?.overallFinalAcceptanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <p className="text-sm font-black theme-title">
                {readiness?.overallFinalAcceptanceReady ? 'Sistem Hazır' : 'Sistem Doğrulanıyor'}
              </p>
            </div>
            <p className="mt-1 text-[10px] theme-muted font-medium italic">Yerel LLM ve IGM çalışma zamanları aktif.</p>
          </div>
          <div className="theme-surface rounded-2xl p-4 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] theme-muted">Üretim Modu</p>
            <p className="mt-2 text-sm font-semibold theme-secondary">Gerçek yerel model çıktıları kullanılır; placeholder veya bulut servisi devre dışıdır.</p>
          </div>
          <div className="theme-surface rounded-2xl p-4 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] theme-muted">Tanılama</p>
            <p className="mt-2 text-sm font-semibold theme-secondary">CPU fallback ve donanım kısıtları çalışma zamanında anlık olarak raporlanır.</p>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FiImage className="text-indigo-400" />
                Vision & Multimodal Sağlık Durumu
              </h2>
              <button
                onClick={checkVisionHealth}
                disabled={loadingVision}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
              >
                {loadingVision ? 'Kontrol Ediliyor...' : 'Sağlık Testini Çalıştır'}
              </button>
            </div>
            {visionHealthData && (
              <div className="mt-4 space-y-3">
                <div className={`rounded-xl border p-3 text-xs font-medium ${
                  visionGpuLock?.locked
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest">GPU Durumu</span>
                    <span className="font-black">{getGpuLockMessage(visionGpuLock)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <span className="font-black uppercase tracking-widest opacity-70">Aktif işlem</span>
                    <span className="font-bold">{formatGpuLockOwner(visionGpuLock?.owner)}</span>
                  </div>
                </div>
              <div className="p-4 rounded-xl bg-[var(--bg-main)]/50 border border-[var(--glass-border)] max-h-60 overflow-y-auto custom-scrollbar">
                <pre className="text-[10px] text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(visionHealthData, null, 2)}
                </pre>
              </div>
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FiCpu className="text-purple-400" />
                  Mini Görsel Anlama Testi
                </h2>
                <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">Qwen3-VL 4B modelinin küçük bir test görselini anlayıp anlayamadığını manuel olarak kontrol eder.</p>
              </div>
              <button
                onClick={runMiniTest}
                disabled={loadingMiniTest}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase hover:bg-purple-500 transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 shrink-0"
              >
                {loadingMiniTest ? 'Test Çalışıyor...' : 'Mini Testi Çalıştır'}
              </button>
            </div>
            
            {miniTestData && (
              <div className={`mt-4 p-4 rounded-xl bg-[var(--bg-main)]/50 border ${miniTestData.ok ? 'border-emerald-500/30' : 'border-rose-500/30'} max-h-60 overflow-y-auto custom-scrollbar`}>
                <div className="flex gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${miniTestData.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    Durum: {miniTestData.ok ? 'Başarılı' : 'Hata'}
                  </span>
                  {miniTestData.durationMs && (
                    <span className="px-2 py-1 rounded bg-zinc-500/10 text-[var(--text-muted)] text-[10px] font-black uppercase">
                      Süre: {miniTestData.durationMs}ms
                    </span>
                  )}
                  <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase">
                    Qwen3-VL 4B Nano Vision
                  </span>
                </div>
                {miniTestData.response && (
                  <div className="mb-2 p-3 rounded-lg bg-black/20 border border-[var(--glass-border)] text-sm font-medium text-[var(--text-main)]">
                    <div className="text-[9px] text-[var(--text-muted)] uppercase font-black mb-1">Model Cevabı:</div>
                    {miniTestData.response}
                  </div>
                )}
                {miniTestData.errors && miniTestData.errors.length > 0 && (
                  <div className="mb-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
                    <div className="text-[9px] uppercase font-black mb-1">Hata Mesajı:</div>
                    {miniTestData.errors.join(' | ')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FiImage className="text-amber-400" />
                  SDXL Turbo Görsel Üretim Durumu
                </h2>
                <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">
                  SDXL Turbo model dosyalarını, runtime durumunu ve güvenli çalışma koşullarını kontrol eder.
                </p>
              </div>
              <button
                onClick={checkImageGenerationHealth}
                disabled={loadingImageHealth}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 shrink-0"
              >
                {loadingImageHealth ? 'Kontrol Ediliyor...' : 'Tekrar Kontrol Et'}
              </button>
            </div>

            <div className={`rounded-2xl border p-4 ${getToneClass(imageCardTone)}`}>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip
                  label={formatBinaryStatus(sdxlFilesReady, 'Dosyalar Hazır', 'Dosya Eksik')}
                  tone={sdxlFilesReady === undefined ? 'muted' : sdxlFilesReady ? 'ready' : 'danger'}
                />
                <StatusChip label={runtimeEnabled ? 'Runtime Açık' : 'Runtime Kapalı'} tone={runtimeEnabled ? 'ready' : 'warning'} />
                <StatusChip label={imagePreflightOk ? 'Preflight Geçti' : 'Preflight Engellendi'} tone={imagePreflightOk ? 'ready' : 'warning'} />
              </div>
              <p className="mt-3 text-sm font-bold">
                {imageRuntime?.message || imageSafeRuntime?.message || 'Görsel üretim sağlık bilgisi bekleniyor.'}
              </p>
              {!runtimeEnabled && (
                <p className="mt-2 text-xs font-medium opacity-80">
                  Runtime kapalı durumu beklenen bir hazırlık durumudur; SDXL Turbo dosyaları hazır olsa bile görsel üretim başlatılmaz.
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className={`col-span-2 rounded-xl border p-3 ${
                imageGpuLock?.locked
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-widest">GPU Durumu</p>
                  <p className="font-black">{getGpuLockMessage(imageGpuLock)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <span className="font-black uppercase tracking-widest opacity-70">Aktif işlem</span>
                  <span className="font-bold">{formatGpuLockOwner(imageGpuLock?.owner)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Model</p>
                <p className="mt-1 font-black">SDXL Turbo</p>
              </div>
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Aktif Image Model</p>
                <p className={`mt-1 font-black ${activeImageModelId === 'sdxl-turbo-1.0' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {activeImageModelId || 'Bilinmiyor'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">CPU Fallback</p>
                <p className={`mt-1 font-black ${imageRuntime?.cpuFallbackAllowed ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                  {imageRuntime?.cpuFallbackAllowed ? 'Aktif' : 'Kapalı'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Dosya Durumu</p>
                <p className={`mt-1 font-black ${sdxlFilesReady === undefined ? 'text-[var(--text-muted)]' : sdxlFilesReady ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatBinaryStatus(sdxlFilesReady, 'Hazır', 'Eksik')}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">RAM</p>
                <p className={`mt-1 font-black ${ramReady ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatBinaryStatus(ramReady, 'Yeterli', 'Yetersiz')}
                </p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">{formatMb(imageSafeRuntime?.freeRamMb)} / min {formatMb(imageSafeRuntime?.minFreeRamMb)}</p>
              </div>
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">VRAM</p>
                <p className={`mt-1 font-black ${vramReady ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatBinaryStatus(vramReady, 'Yeterli', 'Yetersiz')}
                </p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">{formatMb(imageSafeRuntime?.freeVramMb)} / min {formatMb(imageSafeRuntime?.minFreeVramMb)}</p>
              </div>
            </div>

            {imageSafeRuntime?.warnings?.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-medium text-amber-700 dark:text-amber-300">
                {imageSafeRuntime.warnings.join(' | ')}
              </div>
            )}

            {imageSafeRuntime?.errors?.length > 0 && (
              <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-300">
                {imageSafeRuntime.errors.join(' | ')}
              </div>
            )}

            <p className="mt-4 text-[11px] font-medium text-[var(--text-muted)]">
              Aillame Nano görsel üretim isteğini SDXL Turbo'ya yönlendirir; bu kart yalnızca durum kontrolü yapar.
            </p>
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
            {readiness && !readiness.overallFinalAcceptanceReady && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-2">
                <FiStopCircle className="shrink-0 animate-pulse" />
                <span>Yerel çalışma zamanları henüz tam doğrulanmadı. Deneyler kısıtlı olabilir.</span>
              </div>
            )}
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
                <label className="mb-2 block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Oturum Hedefi</label>
                <select
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-main)]/50 p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all appearance-none"
                >
                  <option value="research">Araştırma ve özetleme</option>
                  <option value="create_learning_candidate">Eğitim adayı üretme</option>
                  <option value="explain">Kavram açıklama</option>
                  <option value="compare_models">Model kıyaslama</option>
                  <option value="debug_error">Hata ayıklama</option>
                  <option value="image_generation_plan">Görsel planlama</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Maksimum Tur</label>
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
                    { id: 'nano', icon: <FiCpu />, role: 'Danışman / Değerlendirme' },
                    { id: 'qwen', icon: <FiCpu />, role: 'Qwen3-VL 4B Nano Vision' },
                    { id: 'web_search', icon: <FiSearch />, role: 'Veri toplayıcı' },
                    { id: 'sdxl', icon: <FiImage />, role: 'IGM profili' }
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
                Lab Runtime & Değerlendirme
              </h2>
              <StatusBadge variant="info" label="Tanılama Önizleme" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { name: 'Nano Değerlendirme', status: 'AKTİF', color: 'text-emerald-300', desc: 'Danışman', icon: <FiCpu className="text-emerald-300" /> },
                { name: 'Sağlayıcı Çıktısı', status: 'ÖNİZLEME', color: 'text-cyan-300', desc: 'Kıyaslama', icon: <FiSearch className="text-cyan-300" /> },
                { name: 'LLM Profilleri', status: 'TANILAMA', color: 'text-amber-300', desc: 'Uyumluluk', icon: <FiTerminal className="text-amber-300" /> },
                { name: 'IGM Profilleri', status: 'TANILAMA', color: 'text-amber-300', desc: 'Uyumluluk', icon: <FiImage className="text-amber-300" /> },
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
                sessions.map((s: LabSession) => (
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
                        <span className="flex items-center gap-1 text-emerald-500/80">HEDEF: {s.goal || 'araştırma'}</span>
                        <span className="flex items-center gap-1 text-indigo-500/70">TUR: {s.currentTurn}/{s.maxTurns}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge
                          variant={s.status === 'running' ? 'running' : s.status === 'completed' ? 'completed' : s.status === 'degraded' || s.status === 'failed' ? 'warning' : 'pending'}
                          label={formatLabStatus(s.status)}
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
                    Tur {selectedSession.currentTurn} / {selectedSession.maxTurns}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--glass-border)] to-transparent" />
                </div>

                {selectedSession.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 italic py-20">
                    <FiMessageSquare size={32} className="mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest">Henüz mesaj yok. Deneyi başlatın.</p>
                  </div>
                ) : (
                  selectedSession.messages.map((m: LabMessage, idx: number) => {
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
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-tighter border border-amber-500/20">Kısıtlı / Atlandı</span>
                              ) : m.outputType === 'error' ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-tighter border border-rose-500/20">Kritik Hata</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter border border-emerald-500/20">Aktif Çalıştırma</span>
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

                              {m.generationMetadata?.deviceDetails && (
                                <div className={`mt-3 pt-3 border-t flex flex-col gap-1 ${
                                  m.model === 'sdxl' ? 'border-amber-500/20' : 'border-indigo-500/20'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase opacity-40">Donanım</span>
                                    <span className={`text-[9px] font-black uppercase ${m.generationMetadata?.performanceWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                                      {m.generationMetadata?.deviceDetails}
                                    </span>
                                  </div>
                                  {m.generationMetadata?.performanceWarning && (
                                    <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest italic text-right">
                                      ⚠️ Üretim performansı düşük olabilir (CPU fallback)
                                    </p>
                                  )}
                                </div>
                              )}

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
                              {m.imageUrl && (
                                <div className="mt-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/5 group-hover:shadow-2xl transition-all">
                                  <img
                                    src={m.imageUrl}
                                    alt="Üretilen görsel"
                                    className="w-full h-auto max-h-[400px] object-contain hover:scale-[1.02] transition-transform duration-700"
                                  />
                                  {m.prompt && (
                                    <div className="p-3 border-t border-[var(--glass-border)] bg-[var(--bg-surface)]/80 backdrop-blur-sm">
                                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 opacity-50">Görsel Promptu</p>
                                      <p className="text-[11px] text-[var(--text-main)] italic font-medium">"{m.prompt}"</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Web Search Citations Rendering */}
                              {m.citations && (
                                <div className="mt-4 pt-3 border-t border-current opacity-20">
                                  <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-60">Doğrulanmış Kaynaklar:</p>
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
