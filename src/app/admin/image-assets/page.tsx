'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiImageLine, RiHistoryLine, RiPulseLine, RiCheckboxCircleLine, RiErrorWarningLine, RiDeleteBinLine } from 'react-icons/ri';
import StatusBadge from '@components/ui/StatusBadge';

export default function ImageAssetManagerPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [readiness, setReadiness] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = requireAdminTokenOrRedirect(router);
    if (!token) return;
    setAuthorized(true);
    loadJobs();
    loadReadiness();
  }, []);

  const loadReadiness = async () => {
    try {
      const res = await adminFetch('/api/admin/ai-lab/readiness');
      const data = await res.json();
      if (data.success) setReadiness(data.report);
    } catch {
      // Diagnostic only
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/image/jobs');
      const data = await res.json();
      if (data.success) setJobs(data.jobs);
    } catch {
      // Diagnostic only
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (assetId: string) => {
    if (!confirm('Bu görsel varlığını kalıcı olarak silmek istediğine emin misin?')) return;
    
    try {
      const res = await adminFetch(`/api/admin/image/assets?assetId=${assetId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setJobs(prev => prev.map(job => {
          if (job.outputAssetIds?.includes(assetId)) {
            return {
              ...job,
              outputAssetIds: job.outputAssetIds.filter((id: string) => id !== assetId)
            };
          }
          return job;
        }));
      } else {
        const error = await res.json();
        alert(`Silme hatası: ${error.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Silme işlemi sırasında teknik bir hata oluştu.');
    }
  };

  if (!authorized) return null;

  const igmStatus = readiness?.image?.finalAcceptanceReady ? 'HAZIR' : 'DOĞRULANIYOR';
  const igmDevice = readiness?.image?.deviceDetails || 'CUDA/GPU';
  const isFallback = igmDevice.toLowerCase().includes('fallback');

  return (
    <div className="min-h-screen theme-shell theme-admin-page">
      <main className="mx-auto max-w-7xl p-6 md:p-10 animate-fade-in">
        <header className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em]">IGM Varlıkları ve Geçmiş</p>
            </div>
            <h1 className="text-5xl font-black tracking-tight theme-title">
              Görsel <span className="text-gradient">Varlıkları</span>
            </h1>
            <p className="mt-2 text-sm theme-muted max-w-2xl font-medium">
              Görsel üretim görevlerini, çalışma zamanı (runtime) hazır olma durumunu ve yerel varlık kalıcılığını izleyin.
            </p>
          </div>
          <button
            onClick={() => { loadJobs(); loadReadiness(); }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl theme-surface hover:border-indigo-500/50 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
          >
            <RiPulseLine className={loading ? 'animate-spin' : ''} />
            Varlıkları Yenile
          </button>
        </header>

        <section className="mb-10 grid gap-6 md:grid-cols-4">
          <StatCardSmall label="Toplam Görev" value={jobs.length.toString()} icon={<RiHistoryLine />} />
          <StatCardSmall label="Tamamlanan" value={jobs.filter((j) => j.status === 'completed').length.toString()} icon={<RiCheckboxCircleLine className="text-emerald-500" />} />
          <StatCardSmall 
            label="IGM Runtime" 
            value={igmStatus} 
            icon={<RiPulseLine className={readiness?.image?.finalAcceptanceReady ? 'text-emerald-500' : 'text-amber-500'} />}
          />
          <StatCardSmall 
            label="Hedef Cihaz" 
            value={igmDevice} 
            icon={<RiPulseLine className={isFallback ? 'text-amber-500' : 'text-emerald-500'} />} 
          />
        </section>

        <div className="theme-surface rounded-[28px] overflow-hidden border-transparent shadow-2xl">
          <div className="p-8 border-b theme-divider flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] theme-secondary flex items-center">
              <RiHistoryLine className="mr-3 text-indigo-500" size={16} /> Varlık Geçmişi
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-[9px] theme-muted uppercase font-bold tracking-wider">Depolama: Yerel JSONL</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-500/5 theme-muted text-[9px] uppercase tracking-[0.2em] font-black">
                  <th className="py-5 px-8">Varlık</th>
                  <th className="py-5 px-4">Prompt Bağlamı</th>
                  <th className="py-5 px-4">Cihaz / Motor</th>
                  <th className="py-5 px-4 text-center">Durum</th>
                  <th className="py-5 px-4 text-center">İşlemler</th>
                  <th className="py-5 px-8 text-right">Zaman Damgası</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-divider">
                {jobs.map((job) => (
                  <tr key={job.jobId} className="hover:bg-indigo-500/5 transition-colors group">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        {job.outputAssetIds?.[0] && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border theme-divider shrink-0 bg-black/5">
                            <img 
                              src={`/api/image-generation/view?assetId=${encodeURIComponent(job.outputAssetIds[0])}`} 
                              alt="Varlık" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black theme-title tracking-tight truncate w-32">{job.jobId}</p>
                          <p className="text-[9px] theme-muted font-bold uppercase mt-0.5 tracking-wider">{job.projectId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <p className="text-xs theme-secondary max-w-xs truncate font-medium" title={job.prompt}>{job.prompt}</p>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-wider w-fit">
                          {job.modelId || 'sdxl-turbo'}
                        </span>
                        {job.device && (
                          <span className={`text-[8px] font-bold uppercase ${job.device.toLowerCase() === 'cpu' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            Cihaz: {job.device}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center justify-center">
                        <StatusBadge 
                          variant={job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'failed' : job.status === 'queued' ? 'warning' : 'running'} 
                          label={job.status === 'completed' ? 'tamamlandı' : job.status === 'failed' ? 'hata' : job.status === 'queued' ? 'sırada' : 'çalışıyor'} 
                          className="!text-[8px] !px-2 !py-0.5" 
                        />
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => job.outputAssetIds?.[0] && handleDelete(job.outputAssetIds[0])}
                          disabled={!job.outputAssetIds?.[0]}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Varlığı Sil"
                        >
                          <RiDeleteBinLine size={18} />
                        </button>
                      </div>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <p className="text-[10px] theme-muted font-bold">{new Date(job.createdAt).toLocaleDateString()}</p>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <RiImageLine size={40} />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Kayıtlı geçmiş bulunamadı</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 theme-soft-panel rounded-2xl p-6 flex items-start gap-4 border-transparent">
          <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500 shrink-0">
            <RiErrorWarningLine size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-title mb-1">IGM Uyumluluk Notu</h3>
            <p className="text-xs theme-muted leading-relaxed max-w-4xl">
              Yerel görsel üretimi, SDXL Turbo ile optimal performans için 8GB+ VRAM gerektirir. 
              Varlıklar yerel <code>ImageAssetStore</code> içinde saklanır ve bir sağlayıcı köprüsü aracılığıyla açıkça istenmedikçe 
              dış bulutlara senkronize edilmez.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

function StatCardSmall({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="theme-surface rounded-[22px] p-6 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
      <div className="min-w-0">
        <p className="text-[9px] font-black theme-muted uppercase tracking-[0.25em] mb-1.5">{label}</p>
        <p className="text-2xl font-black theme-title tracking-tight">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl theme-elevated flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
  );
}
