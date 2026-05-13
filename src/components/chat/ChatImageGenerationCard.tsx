'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiDownload, FiImage, FiLoader, FiAlertCircle, FiX, FiZoomIn } from 'react-icons/fi';
import { createPortal } from 'react-dom';

interface ChatImageGenerationCardProps {
  jobId: string;
  prompt: string;
  englishPrompt: string;
}

interface JobStatus {
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  outputAssetIds?: string[];
  errorSummary?: string;
}

// ─── Tauri-safe download (Native) ──────────────────────────────────────────────
// Tauri v2'de en sağlam indirme yöntemi:
// 1. Dialog eklentisiyle kullanıcıya kayıt yerini sor.
// 2. FS eklentisiyle ham veriyi (Uint8Array) dosyaya yaz.
async function downloadImage(imageUrl: string, jobId: string, source: string): Promise<void> {
  console.log(`[ChatImageCard][${source}] Native indirme başladı → ${imageUrl}`);

  try {
    // 1. Dosya içeriğini al
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 2. Dosya adını belirle
    const mimeType = res.headers.get('content-type') || 'image/png';
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'png';
    const defaultFileName = `aillame-${jobId}.${ext}`;

    // 3. Tauri tespiti ve native kaydetme
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');

      // Kullanıcıya yer sor
      const filePath = await save({
        title: 'Görseli Kaydet',
        defaultPath: defaultFileName,
        filters: [{ name: 'Görsel', extensions: [ext] }]
      });

      if (filePath) {
        await writeFile(filePath, uint8Array);
        console.log(`[ChatImageCard][${source}] Dosya native olarak kaydedildi: ${filePath}`);
      }
    } else {
      // Browser fallback (Eğer browser'da çalışırsa)
      const blob = new Blob([uint8Array], { type: mimeType });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = defaultFileName;
      a.click();
    }
  } catch (err) {
    console.error(`[ChatImageCard][${source}] İndirme hatası:`, err);
    throw err;
  }
}

// ─── Lightbox Modal ────────────────────────────────────────────────────────────
function ImageLightbox({
  imageUrl,
  prompt,
  jobId,
  onClose,
}: {
  imageUrl: string;
  prompt: string;
  jobId: string;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDownload = async () => {
    if (downloading) return;
    console.log('[ChatImageCard][Lightbox] İndir butonuna tıklandı');
    setDownloading(true);
    try {
      await downloadImage(imageUrl, jobId, 'lightbox');
    } catch {
      alert('Görsel indirilemedi. Konsol loglarını kontrol edin.');
    } finally {
      setDownloading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Görsel önizleme"
    >
      <div
        className="relative flex flex-col max-w-5xl w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs text-white/50 font-medium italic truncate max-w-[70%]">
            {prompt}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[ChatImageCard][Lightbox] İndir butonuna tıklandı (inline)');
                void handleDownload();
              }}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
              title="Görseli İndir"
            >
              {downloading ? (
                <FiLoader size={13} className="animate-spin" />
              ) : (
                <FiDownload size={13} />
              )}
              İndir
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
              title="Kapat (ESC)"
              aria-label="Modalı kapat"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Görsel */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40">
          <img
            src={imageUrl}
            alt={prompt}
            className="w-full h-auto max-h-[80vh] object-contain"
            draggable={false}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Ana Kart ─────────────────────────────────────────────────────────────────
export default function ChatImageGenerationCard({
  jobId,
  prompt,
  englishPrompt,
}: ChatImageGenerationCardProps) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cardDownloading, setCardDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // ── Polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStatus = async () => {
      if (Date.now() - startTimeRef.current > 10 * 60 * 1000) {
        console.warn(`[ChatImageGenerationCard] Polling timeout: ${jobId}`);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setJob((prev) =>
          prev
            ? { ...prev, status: 'failed', errorSummary: 'Görsel üretim süresi aşıldı (10dk).' }
            : null
        );
        return;
      }

      try {
        const { request } = await import('@/lib/bridge');
        const data = await request<any>({
          path: `/api/image-generation?jobId=${jobId}`,
          tauriCommand: 'get_image_job_status',
          body: { jobId } // Rust invoke hala body alabilir, bridge bunu GET için fetch'te temizleyecek
        });

        const jobData = data.job || data;
        setJob(jobData);

        if (jobData.status === 'completed' || jobData.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('[ChatImageGenerationCard] Polling error:', err);
      }
    };

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);


  // ── Noise canvas animation ────────────────────────────────────────────────
  useEffect(() => {
    if ((job?.status === 'queued' || job?.status === 'running') && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const render = () => {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 50; i++) {
          const gray = Math.floor(Math.random() * 100 + 50);
          ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
          ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2 + 1, Math.random() * 2 + 1);
        }
        animationRef.current = requestAnimationFrame(render);
      };
      animationRef.current = requestAnimationFrame(render);
    } else {
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [job?.status]);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const handleCardDownload = useCallback(async (imageUrl: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ChatImageCard][Kart] İndir butonuna tıklandı →', imageUrl);
    if (cardDownloading) return;
    setCardDownloading(true);
    try {
      await downloadImage(imageUrl, jobId, 'kart');
    } catch {
      alert('Görsel indirilemedi. Konsol loglarını kontrol edin.');
    } finally {
      setCardDownloading(false);
    }
  }, [jobId, cardDownloading]);

  // ── Yükleniyor ────────────────────────────────────────────────────────────
  if (!job) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs font-mono text-indigo-400">
        <FiLoader className="animate-spin" />
        <span>İşlem başlatılıyor...</span>
      </div>
    );
  }

  // ── Hata ─────────────────────────────────────────────────────────────────
  if (job.status === 'failed') {
    return (
      <div className="mt-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 animate-slide-in">
        <div className="flex items-center gap-2 text-rose-500 mb-2">
          <FiAlertCircle />
          <span className="text-xs font-black uppercase tracking-wider">Hata Oluştu</span>
        </div>
        <p className="text-sm text-rose-400/90 leading-relaxed font-medium">
          {job.errorSummary || 'Görsel üretilirken bilinmeyen bir sorun oluştu.'}
        </p>
      </div>
    );
  }

  // ── Tamamlandı ─────────────────────────────────────────────────────────────
  if (job.status === 'completed') {
    if (job.outputAssetIds?.[0]) {
      const imageUrl = `/api/image-generation/view?assetId=${encodeURIComponent(job.outputAssetIds[0])}`;

      return (
        <>
          <div className="mt-2 animate-fade-in">
            {/* Görsel kart — tıkla = lightbox */}
            <div
              className="group relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/20 cursor-zoom-in"
              onClick={openLightbox}
              role="button"
              tabIndex={0}
              aria-label="Büyük önizleme için tıkla"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openLightbox(); }}
            >
              <img
                src={imageUrl}
                alt={prompt}
                className="w-full aspect-[16/9] object-cover transition-all duration-700 ease-out group-hover:scale-[1.02]"
                onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                onError={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                style={{ opacity: 0 }}
                draggable={false}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-3 right-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <FiZoomIn size={14} className="text-white" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3">
                  <p className="text-[10px] text-white/70 italic truncate max-w-[200px]">
                    {englishPrompt || prompt}
                  </p>
                </div>
              </div>
            </div>

            {/* Alt bilgi + sabit indirme butonu */}
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.2em]">
                SDXL · Stable Diffusion
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-emerald-500/60">Hazır ✓</span>
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('[ChatImageCard][Kart-AltBar] İndir butonuna tıklandı');
                    void handleCardDownload(imageUrl, e);
                  }}
                  disabled={cardDownloading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait select-none"
                  title="Görseli İndir"
                  aria-label="Görseli İndir"
                >
                  {cardDownloading
                    ? <FiLoader size={10} className="animate-spin" />
                    : <FiDownload size={10} />
                  }
                  {cardDownloading ? 'İndiriliyor...' : 'İndir'}
                </button>
              </div>
            </div>
          </div>

          {lightboxOpen && (
            <ImageLightbox
              imageUrl={imageUrl}
              prompt={englishPrompt || prompt}
              jobId={jobId}
              onClose={closeLightbox}
            />
          )}
        </>
      );
    }

    // Completed ama outputAssetIds boş
    return (
      <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
        <FiImage className="text-white/20" size={24} />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Görsel Kaydı Yok
          </span>
          <span className="text-[11px] text-white/60 italic">
            Bu görsele ait dosya bulunamadı (silinmiş olabilir).
          </span>
        </div>
      </div>
    );
  }

  // ── Sırada / Üretiliyor ──────────────────────────────────────────────────
  return (
    <div className="mt-2 rounded-2xl border border-white/5 overflow-hidden bg-black/40 shadow-2xl animate-slide-in" style={{ maxWidth: '320px' }}>
      <div className="relative aspect-[16/9] bg-black">
        <canvas ref={canvasRef} width={320} height={180} className="w-full h-full opacity-60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 flex items-center justify-center relative">
            <FiImage size={20} className="text-indigo-400/50" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-black animate-pulse" />
          </div>
          <span className="mt-3 text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] animate-pulse">
            {job.status === 'queued' ? 'Sırada' : 'Üretiliyor'}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono text-indigo-400/70 lowercase tracking-widest">sdxl-turbo · cpu</span>
          <span className="text-[9px] font-black text-white/50">{job.progress}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-500 ease-out" style={{ width: `${job.progress}%` }} />
        </div>
      </div>
    </div>
  );
}
