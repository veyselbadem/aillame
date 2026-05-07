'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiImageLine, RiHistoryLine, RiPulseLine, RiCheckboxCircleLine, RiErrorWarningLine } from 'react-icons/ri';
import StatusBadge from '@components/ui/StatusBadge';

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
    <div className="min-h-screen theme-shell p-8 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b pb-6 theme-divider lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold tracking-tight theme-title">
            <RiImageLine className="mr-4 text-purple-600 dark:text-purple-300" />
            Image Asset Manager / IGM Assets
          </h1>
          <p className="mt-2 text-sm theme-muted">IGM runtime readiness, job history and local asset persistence.</p>
        </div>
        <button onClick={loadJobs} className="rounded-lg theme-elevated px-4 py-2 text-xs font-semibold transition-colors hover:border-indigo-500/35">
          Refresh History
        </button>
      </div>

      <div className="mb-8 rounded-2xl theme-callout-warning p-4">
        <div className="flex items-center gap-3">
          <RiErrorWarningLine className="text-xl" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Final Acceptance Criteria</p>
            <p className="text-[11px] opacity-90">Aillame final kabulü için en az bir yerel IGM (Diffusion) modelinin aktif olması gerekmektedir.</p>
          </div>
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          ['Total Jobs', jobs.length.toString()],
          ['Completed', jobs.filter((j) => j.status === 'completed').length.toString()],
          ['Runtime', process.env.NEXT_PUBLIC_AILLAME_IGM_RUNTIME_ENABLED === 'true' ? 'Enabled' : 'Not Configured'],
          ['Device', 'Auto (CPU/GPU)'],
        ].map(([label, value]) => (
          <div key={label} className="theme-surface rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] theme-muted">{label}</p>
            <p className="mt-2 text-xl font-bold theme-title">{value}</p>
          </div>
        ))}
      </section>

      <div className="theme-surface rounded-2xl p-6">
        <h3 className="mb-6 flex items-center text-sm font-semibold uppercase tracking-wider theme-secondary">
          <RiHistoryLine className="mr-2" /> Image Generation History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs theme-secondary">
            <thead className="border-b text-[10px] uppercase tracking-widest theme-divider theme-muted">
              <tr>
                <th className="pb-3 pl-4">Job Info</th>
                <th className="pb-3">Prompt</th>
                <th className="pb-3">Model</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {jobs.map((job) => (
                <tr key={job.jobId} className="theme-table-row transition-colors">
                  <td className="py-4 pl-4">
                    <div className="font-bold theme-title">{job.jobId}</div>
                    <div className="mt-0.5 font-mono text-[10px] theme-muted">{job.projectId}</div>
                  </td>
                  <td className="max-w-xs truncate py-4">{job.prompt}</td>
                  <td className="py-4 font-mono text-[10px]">{job.modelId || 'default'}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' ? <RiCheckboxCircleLine className="text-emerald-600 dark:text-emerald-300" /> : <RiPulseLine className="animate-spin text-blue-600 dark:text-blue-300" />}
                      <StatusBadge variant={job.status === 'completed' ? 'completed' : 'running'} label={job.status} />
                    </div>
                  </td>
                  <td className="py-4 pr-4 theme-muted">{new Date(job.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {jobs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-10 text-center italic theme-muted">Henüz image generation history kaydı yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
