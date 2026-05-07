'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiShieldFlashLine, RiFlagLine, RiCheckDoubleLine, RiAlertLine, RiInformationLine, RiPulseLine, RiCheckboxCircleLine, RiSkullLine } from 'react-icons/ri';

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
    <div className="min-h-screen bg-[#050505] p-8 text-slate-300 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-light tracking-widest text-white uppercase">
            <RiFlagLine className="mr-4 text-emerald-500" />
            Beta Release Candidate
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Beta Foundation RC ayrı, Live Runtime Acceptance ayrı izlenir. LLM ve IGM gerçek üretim yapmadan final-ready sayılmaz.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadReport} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10 transition-colors">
            Run QA Orchestrator
          </button>
        </div>
      </div>

      {report && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Status Overview */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className={`rounded-3xl border ${report.betaFoundationReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <RiCheckDoubleLine className={`text-2xl ${report.betaFoundationReady ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Beta Foundation RC</span>
                </div>
                <h3 className="text-xl font-bold text-white">{report.betaFoundationReady ? 'READY' : 'INCOMPLETE'}</h3>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  Security, storage, memory and workflow foundation layers are verified.
                </p>
              </div>

              <div className={`rounded-3xl border ${report.liveRuntimeAcceptanceReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <RiPulseLine className={`text-2xl ${report.liveRuntimeAcceptanceReady ? 'text-emerald-500' : 'text-amber-500'} animate-pulse`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Runtime Acceptance</span>
                </div>
                <h3 className="text-xl font-bold text-white">{report.liveRuntimeAcceptanceReady ? 'VERIFIED' : 'NOT READY'}</h3>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  Final acceptance requires one local LLM text output and one local IGM image output through Aillame-controlled workers.
                </p>
              </div>
            </div>

            {/* QA Sections */}
            <div className="grid gap-6 md:grid-cols-2">
              {report.sections.map((section: any) => (
                <div key={section.id} className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 shadow-xl">
                  <h3 className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span>{section.label}</span>
                    <span className="text-[10px] text-emerald-500">{section.status.toUpperCase()}</span>
                  </h3>
                  <div className="space-y-3">
                    {section.checks.map((check: any) => (
                      <div key={check.id} className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                        <span className="text-[11px] text-slate-500">{check.label}</span>
                        <RiCheckboxCircleLine className={check.status === 'passed' ? 'text-emerald-500' : 'text-amber-500'} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Blockers */}
            {report.blockers.length > 0 && (
              <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-8">
                <h3 className="mb-6 flex items-center gap-3 text-lg font-bold text-white">
                  <RiSkullLine className="text-rose-500" /> Release Blockers
                </h3>
                <div className="space-y-6">
                  {report.blockers.map((blocker: any) => (
                    <div key={blocker.id} className="rounded-xl bg-black/40 p-5 border border-rose-500/10">
                      <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">{blocker.id}</p>
                      <p className="mt-2 text-sm text-slate-300">{blocker.description}</p>
                      <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-[11px] text-rose-200/70 italic border border-rose-500/20">
                        Requirement: {blocker.requirement}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">Known Issues</h3>
              <div className="space-y-4">
                {report.knownIssues.map((issue: any) => (
                  <div key={issue.id} className="rounded-xl bg-white/[0.02] p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-bold uppercase text-slate-600">{issue.id}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 rounded ${issue.severity === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{issue.description}</p>
                    {issue.workaround && (
                      <p className="mt-2 text-[10px] text-slate-600 italic">Workaround: {issue.workaround}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">Next Actions</h3>
              <div className="space-y-3">
                {report.nextActions.map((action: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-[11px] text-slate-500 italic leading-relaxed">
                    <div className="mt-1.5 h-1 w-1 rounded-full bg-blue-500 flex-shrink-0" />
                    {action}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 p-8 shadow-2xl">
              <RiShieldFlashLine className="text-3xl text-emerald-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Aillame Beta Foundation</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                This report represents the "Foundation Release Candidate" state. 
                Foundation can be ready while live runtime acceptance remains NOT_CONFIGURED. Full Beta usability requires live LLM and IGM configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
