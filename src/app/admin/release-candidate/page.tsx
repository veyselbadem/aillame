'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiShieldFlashLine, RiFlagLine, RiCheckDoubleLine, RiPulseLine, RiCheckboxCircleLine, RiErrorWarningLine } from 'react-icons/ri';
import StatusBadge from '@components/ui/StatusBadge';

export default function ReleaseCandidatePage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = requireAdminTokenOrRedirect(router);
    if (!token) return;
    setAuthorized(true);
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/release/report');
      const data = await res.json();
      if (data.success) setReport(data.report);
    } catch {
      // Diagnostic only
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen theme-shell p-8 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b pb-6 theme-divider lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold tracking-tight theme-title">
            <RiFlagLine className="mr-4 text-emerald-600 dark:text-emerald-300" />
            Beta Yayın Adayı (RC)
          </h1>
          <p className="mt-2 text-sm theme-muted">
            Beta Foundation RC ve Live Runtime Acceptance ayrı izlenir. LLM ve IGM gerçek üretim yapmadan final-ready sayılmaz.
          </p>
        </div>
        <button onClick={loadReport} className="rounded-lg theme-elevated px-4 py-2 text-xs font-semibold transition-colors hover:border-indigo-500/35">
          QA Orkestrasyonunu Çalıştır
        </button>
      </div>

      {report && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="grid gap-6 md:grid-cols-2">
              <StatusOverviewCard
                icon={<RiCheckDoubleLine className={report.betaFoundationReady ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'} />}
                label="Beta Foundation RC"
                title={report.betaFoundationReady ? 'HAZIR' : 'EKSİK'}
                variant={report.betaFoundationReady ? 'ready' : 'failed'}
                body="Güvenlik, depolama, bellek ve iş akışı temel katmanları doğrulandı."
              />
              <StatusOverviewCard
                icon={<RiPulseLine className={`${report.liveRuntimeAcceptanceReady ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'} animate-pulse`} />}
                label="Live Runtime Kabulü"
                title={report.liveRuntimeAcceptanceReady ? 'DOĞRULANDI' : 'HAZIR DEĞİL'}
                variant={report.liveRuntimeAcceptanceReady ? 'ready' : 'warning'}
                body="Final kabulü için Aillame kontrollü worker'lar üzerinden bir yerel LLM metin çıktısı ve bir yerel IGM görsel çıktısı gereklidir."
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {report.sections.map((section: any) => (
                <div key={section.id} className="theme-surface rounded-2xl p-6">
                  <h3 className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest theme-secondary">
                    <span>{section.label}</span>
                    <StatusBadge variant={section.status === 'passed' ? 'completed' : 'warning'} label={section.status === 'passed' ? 'geçti' : 'uyarı'} />
                  </h3>
                  <div className="space-y-3">
                    {section.checks.map((check: any) => (
                      <div key={check.id} className="flex items-center justify-between border-b pb-2 theme-divider">
                        <span className="text-[11px] theme-muted">{check.label}</span>
                        <RiCheckboxCircleLine className={check.status === 'passed' ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {report.blockers.length > 0 && (
              <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-8">
                <h3 className="mb-6 flex items-center gap-3 text-lg font-bold text-rose-800 dark:text-rose-200">
                  <RiErrorWarningLine /> Release Blockers
                </h3>
                <div className="space-y-6">
                  {report.blockers.map((blocker: any) => (
                    <div key={blocker.id} className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200">{blocker.id}</p>
                      <p className="mt-2 text-sm theme-secondary">{blocker.description}</p>
                      <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-800 dark:text-rose-100">
                        Requirement: {blocker.requirement}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="theme-surface rounded-3xl p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest theme-secondary">Known Issues</h3>
              <div className="space-y-4">
                {report.knownIssues.map((issue: any) => (
                  <div key={issue.id} className="theme-elevated rounded-xl p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase theme-muted">{issue.id}</span>
                      <StatusBadge variant={issue.severity === 'high' ? 'failed' : 'info'} label={issue.severity} />
                    </div>
                    <p className="text-[11px] leading-relaxed theme-secondary">{issue.description}</p>
                    {issue.workaround && (
                      <p className="mt-2 text-[10px] italic theme-muted">Workaround: {issue.workaround}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="theme-surface rounded-3xl p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest theme-secondary">Next Actions</h3>
              <div className="space-y-3">
                {report.nextActions.map((action: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-[11px] leading-relaxed theme-muted">
                    <div className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-blue-500" />
                    {action}
                  </div>
                ))}
              </div>
            </div>

            <div className="theme-soft-panel rounded-3xl p-8">
              <RiShieldFlashLine className="mb-4 text-3xl text-emerald-600 dark:text-emerald-300" />
              <h3 className="mb-2 text-lg font-bold theme-title">Aillame Beta Foundation</h3>
              <p className="text-[11px] leading-relaxed theme-muted">
                This report represents the Foundation Release Candidate state.
                Foundation can be ready while live runtime acceptance remains NOT_CONFIGURED. Full Beta usability requires live LLM and IGM configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusOverviewCard({ icon, label, title, body, variant }: {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  variant: 'ready' | 'warning' | 'failed';
}) {
  return (
    <div className={`rounded-3xl border p-6 ${variant === 'ready' ? 'border-emerald-500/25 bg-emerald-500/10' : variant === 'failed' ? 'border-rose-500/25 bg-rose-500/10' : 'border-amber-500/25 bg-amber-500/10'}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest theme-muted">{label}</span>
      </div>
      <h3 className="text-xl font-bold theme-title">{title}</h3>
      <p className="mt-2 text-[11px] leading-relaxed theme-muted">{body}</p>
    </div>
  );
}
