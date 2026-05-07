'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiComputerLine, RiServerLine, RiFileTextLine, RiImageLine, RiShieldCheckLine, RiAlertLine, RiCheckboxCircleLine } from 'react-icons/ri';

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
  const acceptance = data?.runtimeAcceptance;

  return (
    <div className="min-h-screen bg-[#050505] p-8 text-slate-300 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-light tracking-widest text-white uppercase">
            <RiComputerLine className="mr-4 text-blue-500" />
            Desktop Readiness
          </h1>
          <p className="mt-2 text-sm text-slate-500">Desktop shell prototype, local server boot and final runtime acceptance bridge.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadReadiness} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10 transition-colors">
            Run Readiness Check
          </button>
        </div>
      </div>

      {!report && !loading && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-10 text-center">
          <RiAlertLine className="mx-auto mb-4 text-3xl text-rose-500" />
          <h2 className="text-xl font-bold text-white">Readiness Check Failed</h2>
          <p className="mt-2 text-sm text-slate-400">Could not retrieve desktop readiness data from the server.</p>
        </div>
      )}

      {report && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Acceptance Card */}
          <div className="lg:col-span-2 space-y-8">
            <div className={`rounded-3xl border ${report.runtimeAcceptance.finalAcceptanceReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'} p-8 shadow-2xl`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Beta Acceptance Status</h2>
                  <p className="mt-1 text-sm text-slate-400">Final production release requirements.</p>
                </div>
                <span className={`rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest ${report.runtimeAcceptance.finalAcceptanceReady ? 'bg-emerald-500 text-black' : 'bg-amber-500 text-black'}`}>
                  {report.runtimeAcceptance.finalAcceptanceReady ? 'Ready for Beta' : 'Action Required'}
                </span>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-black/40 p-6 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <RiFileTextLine className="text-xl text-blue-400" />
                    <h3 className="font-bold text-white uppercase tracking-wider text-xs">Live Text Runtime (LLM)</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.runtimeAcceptance.textRuntimeReady ? <RiCheckboxCircleLine className="text-emerald-500" /> : <RiAlertLine className="text-amber-500" />}
                    <span className="text-sm font-medium">{report.runtimeAcceptance.textRuntimeReady ? 'Active & Producing Text' : 'Not Producing Text'}</span>
                  </div>
                  <p className="mt-3 text-[10px] text-slate-500">Requirements: aillame-core-v7.node + Nano v1 checkpoint.</p>
                </div>

                <div className="rounded-2xl bg-black/40 p-6 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <RiImageLine className="text-xl text-purple-400" />
                    <h3 className="font-bold text-white uppercase tracking-wider text-xs">Live Image Runtime (IGM)</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.runtimeAcceptance.imageRuntimeReady ? <RiCheckboxCircleLine className="text-emerald-500" /> : <RiAlertLine className="text-amber-500" />}
                    <span className="text-sm font-medium">{report.runtimeAcceptance.imageRuntimeReady ? 'Active & Producing Images' : 'Not Configured'}</span>
                  </div>
                  <p className="mt-3 text-[10px] text-slate-500">Requirements: Diffusion model + AILLAME_IGM_* env variables.</p>
                </div>
              </div>

              {!report.runtimeAcceptance.finalAcceptanceReady && (
                <div className="mt-8 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Beta Blockers:</p>
                  {report.runtimeAcceptance.blockers.map((b: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-amber-200/70">
                      <div className="h-1 w-1 rounded-full bg-amber-500" />
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Boot Strategy Card */}
            <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-8">
              <h3 className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-400">
                <RiServerLine className="mr-3 text-blue-400" /> Local Server Boot Strategy
              </h3>
              <div className="mt-6 grid gap-4 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">Default Host</span>
                  <span className="font-mono text-blue-400">{data?.desktop?.bootPlan?.defaultHost}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">Default Port</span>
                  <span className="font-mono text-blue-400">{data?.desktop?.bootPlan?.defaultPort}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">Startup Command</span>
                  <span className="font-mono text-slate-300">{data?.desktop?.bootPlan?.startupCommandPreview}</span>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Production Notes:</p>
                <div className="space-y-2">
                  {data?.desktop?.bootPlan?.productionNotes.map((n: string, i: number) => (
                    <p key={i} className="text-[10px] text-slate-500 leading-relaxed italic">• {n}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Diagnostics */}
          <div className="space-y-8">
            <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Shell Diagnostics</h3>
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
                    <span className="text-[11px] text-slate-500">{label}</span>
                    <div className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6">
              <RiShieldCheckLine className="text-2xl text-blue-500 mb-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-2">Aillame Local Hub</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Aillame Desktop, Ollama veya dış servislere bağımlı olmadan çalışacak şekilde tasarlanmıştır. 
                Final kabul için yerel LLM ve IGM çalışma zamanlarının doğrulanması şarttır.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
