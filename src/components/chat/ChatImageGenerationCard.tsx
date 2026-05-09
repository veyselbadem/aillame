'use client';

import { useState, useEffect, useRef } from 'react';
import { FiDownload, FiImage, FiLoader, FiAlertCircle } from 'react-icons/fi';

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

export default function ChatImageGenerationCard({ jobId, prompt, englishPrompt }: ChatImageGenerationCardProps) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const fetchStatus = async () => {
      // 10 minute timeout guard
      if (Date.now() - startTimeRef.current > 10 * 60 * 1000) {
        console.warn(`[ChatImageGenerationCard] Polling timeout for jobId: ${jobId}`);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setJob(prev => prev ? { 
          ...prev, 
          status: 'failed', 
          errorSummary: 'Görsel üretim süresi aşıldı (10dk zaman aşımı). Lütfen sistem durumunu kontrol edin.' 
        } : null);
        return;
      }

      try {
        const res = await fetch(`/api/image-generation?jobId=${jobId}`);
        if (res.ok) {
          const data = await res.json();
          console.log(`[ChatImageGenerationCard] Poll result for ${jobId}:`, data);
          
          const jobData = data.job || data;
          setJob(jobData);
          
          if (jobData.status === 'completed' || jobData.status === 'failed') {
            console.log(`[ChatImageGenerationCard] Polling stopped, job ${jobData.status}`);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch image job status:', err);
      }
    };

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  // Noise animation
  useEffect(() => {
    if ((job?.status === 'queued' || job?.status === 'running') && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const render = () => {
        const w = canvas.width;
        const h = canvas.height;
        
        // Clear with some transparency to create trailing effect or just clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, w, h);

        // Draw random noise rects
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const size = Math.random() * 2 + 1;
          const gray = Math.floor(Math.random() * 100 + 50);
          ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
          ctx.fillRect(x, y, size, size);
        }

        animationRef.current = requestAnimationFrame(render);
      };

      animationRef.current = requestAnimationFrame(render);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [job?.status]);

  if (!job) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs font-mono text-indigo-400">
        <FiLoader className="animate-spin" />
        <span>İşlem başlatılıyor...</span>
      </div>
    );
  }

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

  if (job.status === 'completed') {
    if (job.outputAssetIds?.[0]) {
      const imageUrl = `/api/image-generation/view?assetId=${job.outputAssetIds[0]}`;
      
      return (
        <div className="mt-2 group animate-fade-in">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/20">
            <img 
              src={imageUrl} 
              alt={prompt}
              className="w-full aspect-[16/9] object-cover transition-opacity duration-700 ease-out"
              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              style={{ opacity: 0 }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Prompt</p>
                  <p className="text-xs text-white truncate italic">{englishPrompt || prompt}</p>
                </div>
                <a 
                  href={imageUrl} 
                  download={`aillame-${jobId}.png`}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                  title="İndir"
                >
                  <FiDownload size={18} />
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.2em]">SDXL · Stable Diffusion</span>
            <span className="text-[9px] font-mono text-emerald-500/60">Hazır</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
          <FiImage className="text-white/20" size={24} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Görsel Kaydı Yok</span>
            <span className="text-[11px] text-white/60 italic">Bu görsele ait dosya veya kayıt bulunamadı (silinmiş olabilir).</span>
          </div>
        </div>
      );
    }
  }

  // Loading / Running state
  return (
    <div className="mt-2 rounded-2xl border border-white/5 overflow-hidden bg-black/40 shadow-2xl animate-slide-in" style={{ maxWidth: '320px' }}>
      <div className="relative aspect-[16/9] bg-black">
        <canvas 
          ref={canvasRef} 
          width={320} 
          height={180} 
          className="w-full h-full opacity-60"
        />
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
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
