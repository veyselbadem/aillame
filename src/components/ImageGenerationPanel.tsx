'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiImage, FiLoader, FiZap } from 'react-icons/fi';
import { DEFAULT_IMAGE_GENERATION_MODEL_ID, MODEL_REGISTRY } from '@core/models/registry';
import { IMAGE_SIZE_PRESETS, type ImageSizePreset } from '@core/image-generation/types';

const PRESETS = Object.entries(IMAGE_SIZE_PRESETS) as Array<[ImageSizePreset, typeof IMAGE_SIZE_PRESETS[ImageSizePreset]]>;

const FOUNDATION_STATUS = [
  ['Image Runtime', 'not configured'],
  ['Workflow JSON', 'foundation ready'],
  ['Job Queue', 'preview'],
  ['ComfyUI', 'dependency yok'],
] as const;

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
        throw new Error(payload.error || payload.warning || 'Görsel üretimi başlatılamadı.');
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
