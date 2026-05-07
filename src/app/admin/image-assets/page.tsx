'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiImageLine, RiHistoryLine, RiPulseLine, RiCheckboxCircleLine, RiErrorWarningLine } from 'react-icons/ri';

export default function ImageAssetManagerPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = requireAdminTokenOrRedirect(router);
    if (!token) return;
    setAuthorized(true);
    loadJobs();
  }, []);

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

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#050505] p-8 text-slate-300 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-light tracking-widest text-white uppercase">
            <RiImageLine className="mr-4 text-purple-500" />
            Image Asset Manager
          </h1>
          <p className="mt-2 text-sm text-slate-500">IGM runtime readiness, job history and local asset persistence.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadJobs} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10 transition-colors">
            Refresh History
          </button>
        </div>
      </div>

      <div className="mb-8 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-3 text-amber-200">
          <RiErrorWarningLine className="text-xl" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Final Acceptance Criteria</p>
            <p className="text-[11px] text-amber-200/70">Aillame final kabulü için en az bir yerel IGM (Diffusion) modelinin aktif olması gerekmektedir.</p>
          </div>
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          ['Total Jobs', jobs.length.toString()],
          ['Completed', jobs.filter(j => j.status === 'completed').length.toString()],
          ['Runtime', process.env.NEXT_PUBLIC_AILLAME_IGM_RUNTIME_ENABLED === 'true' ? 'Enabled' : 'Not Configured'],
          ['Device', 'Auto (CPU/GPU)'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600">{label}</p>
            <p className="mt-2 text-xl font-bold text-slate-200">{value}</p>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
        <h3 className="mb-6 flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
          <RiHistoryLine className="mr-2" /> Image Generation History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-600">
              <tr>
                <th className="pb-3 pl-4">Job Info</th>
                <th className="pb-3">Prompt</th>
                <th className="pb-3">Model</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.map((job) => (
                <tr key={job.jobId} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 pl-4">
                    <div className="font-bold text-slate-200">{job.jobId}</div>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">{job.projectId}</div>
                  </td>
                  <td className="py-4 max-w-xs truncate">{job.prompt}</td>
                  <td className="py-4 font-mono text-[10px]">{job.modelId || 'default'}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' ? <RiCheckboxCircleLine className="text-emerald-500" /> : <RiPulseLine className="animate-spin text-blue-500" />}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-600 italic">No image generation history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
