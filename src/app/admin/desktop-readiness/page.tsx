'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiComputerLine, RiServerLine, RiFileTextLine, RiImageLine, RiShieldCheckLine, RiAlertLine, RiCheckboxCircleLine } from 'react-icons/ri';
import StatusBadge from '@components/ui/StatusBadge';

export default function DesktopReadinessPage() {
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
    <div className="min-h-screen theme-shell p-8 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b pb-6 theme-divider lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold tracking-tight theme-title">
            <RiComputerLine className="mr-4 text-blue-600 dark:text-blue-300" />
            Desktop Readiness
          </h1>
          <p className="mt-2 text-sm theme-muted">Desktop shell prototype, local server boot and final runtime acceptance bridge.</p>
        </div>
        <button onClick={loadReadiness} className="rounded-lg theme-elevated px-4 py-2 text-xs font-semibold transition-colors hover:border-indigo-500/35">
          Run Readiness Check
        </button>
      </div>

      {!report && !loading && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-10 text-center">
          <RiAlertLine className="mx-auto mb-4 text-3xl text-rose-600 dark:text-rose-300" />
          <h2 className="text-xl font-bold theme-title">Readiness Check Failed</h2>
          <p className="mt-2 text-sm theme-muted">Could not retrieve desktop readiness data from the server.</p>
        </div>
      )}

      {report && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className={`rounded-3xl border p-8 ${report.runtimeAcceptance.finalAcceptanceReady ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-amber-500/25 bg-amber-500/10'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold theme-title">Beta Acceptance Status</h2>
                  <p className="mt-1 text-sm theme-muted">Final production release requirements.</p>
                </div>
                <StatusBadge
                  variant={report.runtimeAcceptance.finalAcceptanceReady ? 'ready' : 'warning'}
                  label={report.runtimeAcceptance.finalAcceptanceReady ? 'Ready for Beta' : 'Action Required'}
                />
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <RuntimeRequirementCard
                  icon={<RiFileTextLine className="text-xl text-blue-600 dark:text-blue-300" />}
                  title="Live Text Runtime (LLM)"
                  ready={report.runtimeAcceptance.textRuntimeReady}
                  readyText="Active & Producing Text"
                  waitingText="Not Producing Text"
                  note="Requirements: aillame-core-v7.node + Nano v1 checkpoint."
                />
                <RuntimeRequirementCard
                  icon={<RiImageLine className="text-xl text-purple-600 dark:text-purple-300" />}
                  title="Live Image Runtime (IGM)"
                  ready={report.runtimeAcceptance.imageRuntimeReady}
                  readyText="Active & Producing Images"
                  waitingText="Not Configured"
                  note="Requirements: Diffusion model + AILLAME_IGM_* env variables."
                />
              </div>

              {!report.runtimeAcceptance.finalAcceptanceReady && (
                <div className="mt-8 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-200">Beta Blockers:</p>
                  {report.runtimeAcceptance.blockers.map((b: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-100">
                      <div className="h-1 w-1 rounded-full bg-amber-500" />
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="theme-surface rounded-3xl p-8">
              <h3 className="flex items-center text-sm font-bold uppercase tracking-widest theme-secondary">
                <RiServerLine className="mr-3 text-blue-600 dark:text-blue-300" /> Local Server Boot Strategy
              </h3>
              <div className="mt-6 grid gap-4 text-xs">
                <KeyValue label="Default Host" value={data?.desktop?.bootPlan?.defaultHost} />
                <KeyValue label="Default Port" value={data?.desktop?.bootPlan?.defaultPort} />
                <KeyValue label="Startup Command" value={data?.desktop?.bootPlan?.startupCommandPreview} />
              </div>
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest theme-muted">Production Notes:</p>
                <div className="space-y-2">
                  {data?.desktop?.bootPlan?.productionNotes.map((n: string, i: number) => (
                    <p key={i} className="text-[10px] leading-relaxed theme-muted">- {n}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="theme-surface rounded-3xl p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest theme-secondary">Shell Diagnostics</h3>
              <div className="space-y-4">
                {[
                  ['Shell Prototype', report.shellAvailable],
                  ['Boot Planned', report.localServerBootPlanned],
                  ['Health Check', report.healthCheckReady],
                  ['Storage Engine', report.storageReady],
                  ['Security Layer', report.securityReady],
                  ['Packaging', report.packagingReady],
                ].map(([label, ok]) => (
                  <div key={label as string} className="flex items-center justify-between">
                    <span className="text-[11px] theme-muted">{label}</span>
                    <div className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="theme-surface rounded-3xl p-6">
              <RiShieldCheckLine className="mb-4 text-2xl text-blue-600 dark:text-blue-300" />
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest theme-title">Aillame Local Hub</h3>
              <p className="text-[10px] leading-relaxed theme-muted">
                Aillame Desktop, harici runtime wrapper zorunluluğu olmadan çalışacak şekilde tasarlanmıştır.
                Final kabul için yerel LLM ve IGM çalışma zamanlarının doğrulanması şarttır.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RuntimeRequirementCard({ icon, title, ready, readyText, waitingText, note }: {
  icon: React.ReactNode;
  title: string;
  ready: boolean;
  readyText: string;
  waitingText: string;
  note: string;
}) {
  return (
    <div className="theme-surface rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-wider theme-title">{title}</h3>
      </div>
      <div className="flex items-center gap-2 theme-secondary">
        {ready ? <RiCheckboxCircleLine className="text-emerald-600 dark:text-emerald-300" /> : <RiAlertLine className="text-amber-600 dark:text-amber-300" />}
        <span className="text-sm font-medium">{ready ? readyText : waitingText}</span>
      </div>
      <p className="mt-3 text-[10px] theme-muted">{note}</p>
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
