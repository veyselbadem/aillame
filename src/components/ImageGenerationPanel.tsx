'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiImage, FiLoader, FiRefreshCw, FiZap } from 'react-icons/fi';
import { DEFAULT_IMAGE_GENERATION_MODEL_ID, MODEL_REGISTRY } from '@core/models/registry';
import { IMAGE_SIZE_PRESETS, type ImageSizePreset } from '@core/image-generation/types';

const PRESETS = Object.entries(IMAGE_SIZE_PRESETS) as Array<[ImageSizePreset, typeof IMAGE_SIZE_PRESETS[ImageSizePreset]]>;

const FOUNDATION_STATUS = [
  ['Image Runtime', 'not configured'],
  ['Workflow JSON', 'foundation ready'],
  ['Job Queue', 'preview'],
  ['ComfyUI', 'dependency yok'],
] as const;

type ImageGenerationHealth = {
  ok?: boolean;
  model?: {
    id?: string;
    name?: string;
  };
  files?: {
    diffusersExists?: boolean;
    safetensorsExists?: boolean;
  };
  runtime?: {
    enabled?: boolean;
    cpuFallbackAllowed?: boolean;
    message?: string;
  };
  safeRuntime?: {
    ok?: boolean;
    freeRamMb?: number;
    freeVramMb?: number;
    minFreeRamMb?: number;
    minFreeVramMb?: number;
    errors?: string[];
    warnings?: string[];
    message?: string;
  };
  gpuHeavyLock?: {
    locked?: boolean;
    owner?: string | null;
    message?: string;
  };
};

function formatMb(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Ölçülemedi';
  return `${value.toLocaleString('tr-TR')} MB`;
}

function statusTone(ok: boolean | undefined, warningWhenFalse = true) {
  if (ok === undefined) return 'border-white/10 bg-white/5 text-gray-400';
  if (ok) return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';
  return warningWhenFalse
    ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
    : 'border-rose-400/20 bg-rose-500/10 text-rose-300';
}

function StatusPill({ label, ok, warningWhenFalse = true }: { label: string; ok?: boolean; warningWhenFalse?: boolean }) {
  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(ok, warningWhenFalse)}`}>
      {label}
    </span>
  );
}

function formatGpuLockOwner(owner?: string | null) {
  const labels: Record<string, string> = {
    'qwen-vlm': 'Qwen3-VL 4B görsel anlama',
    'sdxl-turbo': 'SDXL Turbo görsel üretim',
    'nano-training': 'Aillame Nano eğitim',
  };
  return owner ? labels[owner] || owner : 'Yok';
}

function getGpuLockMessage(lock?: ImageGenerationHealth['gpuHeavyLock']) {
  if (!lock?.locked) return 'Ağır GPU işlemi yok.';
  return lock.message || 'Başka bir ağır GPU işlemi devam ediyor.';
}

export default function ImageGenerationPanel() {
  const model = MODEL_REGISTRY[DEFAULT_IMAGE_GENERATION_MODEL_ID];
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [preset, setPreset] = useState<ImageSizePreset>('square');
  const [steps, setSteps] = useState(30);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [health, setHealth] = useState<ImageGenerationHealth | null>(null);
  const [activeImageModelId, setActiveImageModelId] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const [healthResponse, activeResponse] = await Promise.all([
        fetch('/api/aillame/image-generation/health'),
        fetch('/api/models/active'),
      ]);

      if (!healthResponse.ok) {
        throw new Error('Görsel üretim durumu alınamadı.');
      }

      const healthPayload = await healthResponse.json();
      setHealth(healthPayload);

      if (activeResponse.ok) {
        const activePayload = await activeResponse.json();
        setActiveImageModelId(activePayload.activeImageModelId || activePayload.imageModel?.id || null);
      }

      setHealthCheckedAt(new Date().toLocaleTimeString('tr-TR'));
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Görsel üretim durumu alınamadı.');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const filesReady = health?.files
    ? Boolean(health.files.diffusersExists && health.files.safetensorsExists)
    : undefined;
  const runtimeEnabled = health?.runtime?.enabled === true;
  const cpuFallbackAllowed = health?.runtime?.cpuFallbackAllowed === true;
  const safeRuntime = health?.safeRuntime;
  const gpuHeavyLock = health?.gpuHeavyLock;
  const ramReady = safeRuntime?.errors
    ? !safeRuntime.errors.some((item) => item.toLocaleLowerCase('tr-TR').includes('ram yetersiz'))
    : undefined;
  const vramReady = safeRuntime?.errors
    ? !safeRuntime.errors.some((item) => item.toLocaleLowerCase('tr-TR').includes('gpu belleği yetersiz'))
    : undefined;
  const preflightOk = safeRuntime?.ok === true;
  const runtimeMessage = healthError
    || health?.runtime?.message
    || safeRuntime?.message
    || 'Görsel üretim durumu kontrol ediliyor.';
  const generateHint = !filesReady && filesReady !== undefined
    ? 'SDXL Turbo dosyaları eksik, görsel üretim başlatılamaz.'
    : !runtimeEnabled
      ? 'SDXL Turbo dosyaları hazır, ancak görsel üretim runtime’ı henüz etkin değil.'
      : !vramReady && vramReady !== undefined
        ? 'GPU belleği yetersiz, görsel üretim başlatılamaz.'
        : !ramReady && ramReady !== undefined
          ? 'RAM yetersiz, görsel üretim başlatılamaz.'
          : cpuFallbackAllowed
            ? 'CPU fallback aktif, işlem daha yavaş sürebilir.'
            : 'Görsel üretim güvenli çalışma koşulları kontrol edildi.';

  const handleDownload = useCallback(async () => {
    if (!image || downloading) return;
    console.log('[ImageGenerationPanel] Native indirme başladı →', image);
    setDownloading(true);
    try {
      const res = await fetch(image);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const mimeType = res.headers.get('content-type') || 'image/png';
      const ext = mimeType.split('/')[1]?.split('+')[0] || 'png';
      const fileName = `aillame-${jobId || Date.now()}.${ext}`;

      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');

        const filePath = await save({
          title: 'Görseli Kaydet',
          defaultPath: fileName,
          filters: [{ name: 'Görsel', extensions: [ext] }]
        });

        if (filePath) {
          await writeFile(filePath, uint8Array);
          console.log('[ImageGenerationPanel] Dosya native kaydedildi:', filePath);
        }
      } else {
        const blob = new Blob([uint8Array], { type: mimeType });
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        a.click();
      }
    } catch (err) {
      console.error('[ImageGenerationPanel] İndirme başarısız:', err);
      alert('Görsel indirilemedi.');
    } finally {
      setDownloading(false);
    }
  }, [image, jobId, downloading]);



  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setJobStatus('queued');
    setError(null);

    try {
      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, negativePrompt, preset, steps }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || payload.error || payload.warning || payload.errors?.join(' | ') || 'Görsel üretimi başlatılamadı.');
      }
      setJobId(payload.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görsel üretimi başarısız oldu.');
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (jobId && ['queued', 'running'].includes(jobStatus || '')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/image-generation?jobId=${jobId}`);
          const data = await res.json();
          if (data.job) {
            setJobStatus(data.job.status);
            if (data.job.status === 'completed') {
              setLoading(false);
              if (data.job.outputAssetIds?.length > 0) {
                setImage(`/api/image-generation/view?assetId=${data.job.outputAssetIds[0]}`);
              }
              clearInterval(interval);
            } else if (['failed', 'not-configured'].includes(data.job.status)) {
              setLoading(false);
              setError(`Worker Error: ${data.job.errorSummary || data.job.status}`);
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pt-12 md:pt-20 pb-12 animate-fade-in">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <FiImage size={14} className="text-indigo-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Image Workflow Foundation</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">Görsel Üretim</h1>
        <p className="mt-3 text-gray-400 max-w-2xl">
          {model.label} ile yerel görsel üretim arayüzü. Faz 4 foundation: workflow JSON, job queue ve SDXL-like adapter şu an güvenli preview/not-configured modundadır.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        {FOUNDATION_STATUS.map(([label, value]) => (
          <div key={label} className="glass-card rounded-2xl border-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-gray-200">{value}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 glass-card rounded-[28px] border-white/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">SDXL Turbo Durumu</h2>
              <StatusPill
                label={runtimeEnabled ? 'Runtime Açık' : 'Runtime Kapalı'}
                ok={runtimeEnabled}
              />
              <StatusPill
                label={preflightOk ? 'Preflight Geçti' : 'Preflight Engellendi'}
                ok={preflightOk}
              />
            </div>
            <p className="mt-2 max-w-3xl text-sm text-gray-400">
              Görsel üretim başlamadan önce model dosyaları, runtime ve güvenli çalışma koşulları kontrol edilir.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshHealth}
            disabled={healthLoading}
            className="h-10 shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-gray-200 transition-all hover:bg-white/10 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <FiRefreshCw className={healthLoading ? 'animate-spin' : ''} />
              Durumu Yenile
            </span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-2xl border p-4 lg:col-span-2 ${
            gpuHeavyLock?.locked
              ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
              : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
          }`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">GPU Durumu</p>
            <p className="mt-2 text-sm font-black">{getGpuLockMessage(gpuHeavyLock)}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <span className="font-black uppercase tracking-widest opacity-70">Aktif işlem</span>
              <span className="font-bold">{formatGpuLockOwner(gpuHeavyLock?.owner)}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Aktif Model</p>
            <p className={`mt-2 text-sm font-black ${activeImageModelId === 'sdxl-turbo-1.0' ? 'text-emerald-300' : 'text-amber-300'}`}>
              {activeImageModelId || health?.model?.id || 'Bilinmiyor'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Model Dosyaları</p>
            <p className={`mt-2 text-sm font-black ${filesReady === undefined ? 'text-gray-400' : filesReady ? 'text-emerald-300' : 'text-rose-300'}`}>
              {filesReady === undefined ? 'Kontrol ediliyor' : filesReady ? 'Hazır' : 'Eksik'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">CPU Fallback</p>
            <p className={`mt-2 text-sm font-black ${cpuFallbackAllowed ? 'text-amber-300' : 'text-gray-400'}`}>
              {cpuFallbackAllowed ? 'Aktif' : 'Kapalı'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Son Kontrol</p>
            <p className="mt-2 text-sm font-black text-gray-200">{healthCheckedAt || 'Bekleniyor'}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">RAM</p>
            <p className={`mt-2 text-sm font-black ${ramReady === undefined ? 'text-gray-400' : ramReady ? 'text-emerald-300' : 'text-rose-300'}`}>
              {ramReady === undefined ? 'Ölçülüyor' : ramReady ? 'Yeterli' : 'Yetersiz'}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">{formatMb(safeRuntime?.freeRamMb)} / min {formatMb(safeRuntime?.minFreeRamMb)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">VRAM</p>
            <p className={`mt-2 text-sm font-black ${vramReady === undefined ? 'text-gray-400' : vramReady ? 'text-emerald-300' : 'text-rose-300'}`}>
              {vramReady === undefined ? 'Ölçülüyor' : vramReady ? 'Yeterli' : 'Yetersiz'}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">{formatMb(safeRuntime?.freeVramMb)} / min {formatMb(safeRuntime?.minFreeVramMb)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Preflight</p>
            <p className={`mt-2 text-sm font-black ${preflightOk ? 'text-emerald-300' : 'text-amber-300'}`}>
              {preflightOk ? 'Geçti' : 'Engellendi'}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">{runtimeMessage}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-indigo-400/15 bg-indigo-500/10 px-4 py-3 text-xs font-medium text-indigo-100">
          Aillame Nano görsel üretim isteğini SDXL Turbo'ya yönlendirir. Nano şu anda doğrudan görsel üretmez; gelecekte yerel üretim yetenekleri genişletilebilir.
        </div>

        {safeRuntime?.warnings?.length ? (
          <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-200">
            {safeRuntime.warnings.join(' | ')}
          </div>
        ) : null}

        {(healthError || safeRuntime?.errors?.length) ? (
          <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-200">
            {healthError || safeRuntime?.errors?.join(' | ')}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
        <section className="glass-card rounded-[28px] p-5 border-white/5">
          <div className="space-y-5 relative z-10">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={6}
                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-400/40 resize-none"
                placeholder="Sinema ışığında, detaylı, yüksek kaliteli..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">Negatif Prompt</label>
              <textarea
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                rows={3}
                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-400/40 resize-none"
                placeholder="bulanık, düşük kalite, deforme..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">Boyut</label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={`rounded-2xl px-3 py-3 border text-left transition-all ${
                      preset === key
                        ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100'
                        : 'border-white/10 bg-black/20 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className="block text-xs font-black">{item.label}</span>
                    <span className="block text-[10px] font-mono opacity-60">{item.width}x{item.height}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Adım</label>
                <span className="text-xs font-mono text-gray-500">{steps}</span>
              </div>
              <input type="range" min={10} max={60} value={steps} onChange={(event) => setSteps(Number(event.target.value))} className="w-full" />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale transition-all hover:shadow-lg hover:shadow-indigo-500/20"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiZap />}
              {jobStatus === 'queued' ? 'Sırada...' : jobStatus === 'running' ? 'Üretiliyor...' : 'Üret'}
            </button>
            <div className={`rounded-2xl border px-4 py-3 text-xs font-medium ${
              runtimeEnabled && preflightOk
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-400/20 bg-amber-500/10 text-amber-200'
            }`}>
              {generateHint}
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[28px] min-h-[560px] p-5 border-white/5 flex items-center justify-center overflow-hidden">
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {image ? (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-1 min-h-[420px] rounded-[24px] overflow-hidden bg-black/30 border border-white/10 flex items-center justify-center">
                  <img src={image} alt={prompt} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-mono text-gray-500">Seed: {seed ?? 'auto'}</span>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait transition-all active:scale-95"
                    title="Görseli indir"
                  >
                    {downloading ? <FiLoader size={14} className="animate-spin" /> : <FiDownload size={14} />}
                    Dışa Aktar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-50">
                <FiImage size={96} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">SDXL-like Önizleme</p>
                <p className="mt-2 text-xs text-gray-500">Gerçek model çalıştırma bu fazda kapalıdır.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
