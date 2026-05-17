'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiComputerLine, RiServerLine, RiFileTextLine, RiImageLine, RiShieldCheckLine, RiAlertLine, RiCheckboxCircleLine, RiPulseLine } from 'react-icons/ri';
import StatusBadge from '@components/ui/StatusBadge';

export default function DesktopReadinessPage() {
  // Diagnostic ID for smoke test: Desktop Readiness
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = requireAdminTokenOrRedirect(router);
    if (!token) return;
    setAuthorized(true);
    loadReadiness();
  }, []);

  const loadReadiness = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/aillame/desktop/readiness');
      const data = await res.json();
      if (data.success) setData(data);
    } catch {
      // Diagnostic only
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) return null;

  const report = data?.report;

  return (
    <div className="min-h-screen theme-shell theme-admin-page">
      <main className="mx-auto max-w-7xl p-6 md:p-10 animate-fade-in">
        <header className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em]">Masaüstü Doğrulama Köprüsü</p>
            </div>
            <h1 className="text-5xl font-black tracking-tight theme-title">
              Masaüstü <span className="text-gradient">Hazırlığı</span>
            </h1>
            <p className="mt-2 text-sm theme-muted max-w-2xl font-medium">
              Yerel sunucu başlatma stratejisini, shell prototip kullanılabilirliğini ve final runtime kabulünü doğrulayın.
            </p>
          </div>
          <button
            onClick={loadReadiness}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl theme-surface hover:border-blue-500/50 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
          >
            <RiPulseLine className={loading ? 'animate-spin' : ''} />
            Denetimi Çalıştır
          </button>
        </header>

        {!report && !loading && (
          <div className="rounded-[28px] border border-rose-500/25 bg-rose-500/5 p-12 text-center">
            <RiAlertLine className="mx-auto mb-4 text-4xl text-rose-500" />
            <h2 className="text-2xl font-black theme-title">Denetim Kesildi</h2>
            <p className="mt-2 text-sm theme-muted">Tanılama uç noktasından masaüstü hazırlık metrikleri alınamadı.</p>
          </div>
        )}

        {report && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              {/* Acceptance Hero */}
              <div className={`rounded-[32px] border p-10 relative overflow-hidden ${report.runtimeAcceptance.finalAcceptanceReady ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <div className={`absolute top-0 right-0 w-64 h-64 -mr-20 -mt-20 rounded-full blur-3xl opacity-10 ${report.runtimeAcceptance.finalAcceptanceReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                
                <div className="relative z-10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
                    <div>
                      <h2 className="text-3xl font-black theme-title tracking-tight">Kabul Kriterleri</h2>
                      <p className="mt-1 text-[11px] theme-muted uppercase font-bold tracking-wider">Final üretim sürüm kapısı</p>
                    </div>
                    <StatusBadge
                      variant={report.runtimeAcceptance.finalAcceptanceReady ? 'ready' : 'warning'}
                      label={report.runtimeAcceptance.finalAcceptanceReady ? 'BETA İÇİN HAZIR' : 'ENGELLEYİCİLER VAR'}
                      className="!px-4 !py-1.5 !text-[10px] !font-black"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <RuntimeRequirementCard
                      icon={<RiFileTextLine className="text-2xl text-blue-500" />}
                      title="YEREL LLM (METİN)"
                      ready={report.runtimeAcceptance.textRuntimeReady}
                      readyText="HAZIR"
                      waitingText="KISITLI"
                      note={report.runtimeAcceptance.textRuntimeReady ? "Yerel GGUF modeliyle metin üretimi doğrulandı." : "Henüz başarılı bir yerel metin üretimi yapılmadı."}
                    />
                    <RuntimeRequirementCard
                      icon={<RiImageLine className="text-2xl text-purple-500" />}
                      title="YEREL IGM (GÖRSEL)"
                      ready={report.runtimeAcceptance.imageRuntimeReady}
                      readyText="HAZIR"
                      waitingText="BEKLENİYOR"
                      note={report.runtimeAcceptance.imageRuntimeReady ? "SDXL Turbo ile gerçek görsel üretimi doğrulandı." : "Henüz başarılı bir yerel görsel üretimi yapılmadı."}
                      device={data.runtimeAcceptance?.image?.deviceDetails}
                      deviceReason={data.runtimeAcceptance?.image?.deviceReason}
                      performanceWarning={data.runtimeAcceptance?.image?.performanceWarning}
                      realOutput={data.runtimeAcceptance?.image?.fileExists && !data.runtimeAcceptance?.image?.placeholderUsed}
                    />
                  </div>

                  {report.runtimeAcceptance.finalAcceptanceReady && (
                    <div className="mt-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4">
                      <RiCheckboxCircleLine className="text-2xl text-emerald-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold theme-title">Tüm Yerel AI Servisleri Doğrulandı</p>
                        <p className="mt-1 text-[11px] theme-muted leading-relaxed">
                          Sistem, hiçbir bulut bağımlılığı olmadan metin ve görsel üretebilmektedir. 
                          Üretilen tüm çıktılar gerçektir (placeholder kullanılmamıştır) ve yerel asset deposuna kaydedilmiştir.
                        </p>
                      </div>
                    </div>
                  )}

                  {!report.runtimeAcceptance.finalAcceptanceReady && (
                    <div className="mt-10 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3">Kritik Engeller:</p>
                      <div className="space-y-2">
                        {report.runtimeAcceptance.blockers.map((b: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 text-xs theme-title font-medium">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {b}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Server Boot Plan */}
              <div className="theme-surface rounded-[28px] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <RiServerLine size={20} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] theme-secondary">
                    Yerel Sunucu Başlatma Stratejisi
                  </h3>
                </div>
                <div className="grid gap-5">
                  <KeyValue label="Host" value={data?.desktop?.bootPlan?.defaultHost} />
                  <KeyValue label="Hedef Port" value={data?.desktop?.bootPlan?.defaultPort} />
                  <div className="space-y-2">
                    <p className="text-[9px] theme-muted uppercase font-black tracking-widest">Başlatma Komutu</p>
                    <div className="p-4 rounded-xl theme-elevated font-mono text-[11px] theme-secondary break-all border border-transparent hover:border-indigo-500/20 transition-all">
                      {data?.desktop?.bootPlan?.startupCommandPreview}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-8">
              {/* Shell Diagnostics */}
              <div className="theme-surface rounded-[28px] p-8 shadow-xl">
                <h3 className="mb-8 text-[11px] font-black uppercase tracking-[0.3em] theme-muted">Dahili Shell Denetimi</h3>
                <div className="space-y-5">
                  {[
                    ['Shell Arayüzü', report.shellAvailable],
                    ['Boot Denetleyici', report.localServerBootPlanned],
                    ['Sağlık Monitörü', report.healthCheckReady],
                    ['Depolama Sürücüsü', report.storageReady],
                    ['Güvenlik Kapsamı', report.securityReady],
                    ['Paketleme Hazır', report.packagingReady],
                  ].map(([label, ok]) => (
                    <div key={label as string} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold theme-secondary">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase ${ok ? 'text-emerald-500' : 'text-slate-400'}`}>{ok ? 'TAMAM' : 'BEKLE'}</span>
                        <div className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-300 dark:bg-slate-700'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Card */}
              <div className="theme-soft-panel rounded-[28px] p-8 border-transparent">
                <RiShieldCheckLine className="mb-4 text-3xl text-blue-500" />
                <h3 className="mb-3 text-xs font-black uppercase tracking-widest theme-title">Yerel Bağımsızlık</h3>
                <p className="text-[11px] leading-relaxed theme-muted font-medium">
                  Aillame mutlak yerel bağımsızlığı hedefler. Masaüstü hazırlık kontrolü, sistemin kendi orkestrasyon sunucusunu 
                  başlatarak ve dış bulut bağımlılığı olmadan yerel çıkarım çalışma zamanlarını yöneterek tamamen çevrimdışı 
                  çalışabilmesini sağlar.
                </p>
              </div>
            </aside>

          </div>
        )}
      </main>
    </div>
  );
}

function RuntimeRequirementCard({ 
  icon, 
  title, 
  ready, 
  readyText, 
  waitingText, 
  note,
  device,
  deviceReason,
  performanceWarning,
  realOutput
}: {
  icon: React.ReactNode;
  title: string;
  ready: boolean;
  readyText: string;
  waitingText: string;
  note: string;
  device?: string;
  deviceReason?: string;
  performanceWarning?: boolean;
  realOutput?: boolean;
}) {
  return (
    <div className="theme-surface rounded-2xl p-6 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-xs font-bold uppercase tracking-wider theme-title">{title}</h3>
        </div>
        {ready && realOutput && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            <RiShieldCheckLine size={10} />
            <span className="text-[8px] font-black uppercase">Gerçek Çıktı</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        {ready ? <RiCheckboxCircleLine className="text-emerald-500" /> : <RiAlertLine className="text-amber-500" />}
        <span className={`text-sm font-black tracking-tight ${ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {ready ? readyText : waitingText}
        </span>
      </div>

      <p className="mb-4 text-[10px] theme-muted leading-relaxed font-medium">{note}</p>
      
      {device && (
        <div className="pt-4 border-t theme-divider space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] theme-muted uppercase font-black">Donanım</span>
            <span className={`text-[9px] font-black uppercase ${performanceWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
              {device}
            </span>
          </div>
          {deviceReason && (
            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[9px] theme-secondary italic">
              {deviceReason}
            </div>
          )}
          {performanceWarning && (
            <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest">
              ⚠️ Üretim performansı düşük olabilir
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex justify-between border-b pb-2 theme-divider">
      <span className="theme-muted">{label}</span>
      <span className="font-mono theme-secondary">{value ?? '-'}</span>
    </div>
  );
}
