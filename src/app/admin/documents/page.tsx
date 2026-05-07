'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, requireAdminTokenOrRedirect } from '@lib/admin-fetch';
import { RiFileList3Line, RiUploadCloud2Line, RiSearch2Line, RiHistoryLine } from 'react-icons/ri';
import StatusBadge from '@components/ui/StatusBadge';

export default function DocumentLibraryPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = requireAdminTokenOrRedirect(router);
    if (!token) return;
    setAuthorized(true);
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/documents');
      const data = await res.json();
      if (data.success) setDocuments(data.documents);
    } catch (err: any) {
      setError(err.message);
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
            <RiFileList3Line className="mr-4 text-emerald-600 dark:text-emerald-300" />
            Document Library / RAG
          </h1>
          <p className="mt-2 text-sm theme-muted">Persistent RAG memory, document ingestion and project-based isolation.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg theme-elevated px-4 py-2 text-xs font-semibold transition-colors hover:border-indigo-500/35">
          <RiUploadCloud2Line /> Ingest Document
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          ['Total Docs', documents.length.toString()],
          ['Active', documents.filter((d) => d.status === 'active').length.toString()],
          ['Chunks', documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0).toString()],
          ['Storage', 'JSONL Persistent'],
        ].map(([label, value]) => (
          <div key={label} className="theme-surface rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] theme-muted">{label}</p>
            <p className="mt-2 text-xl font-bold theme-title">{value}</p>
          </div>
        ))}
      </section>

      <div className="theme-surface rounded-2xl p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider theme-secondary">
            <RiHistoryLine className="mr-2" /> Document Repository
          </h3>
          <div className="relative">
            <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
            <input type="text" placeholder="Search library..." className="theme-input rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs theme-secondary">
            <thead className="border-b text-[10px] uppercase tracking-widest theme-divider theme-muted">
              <tr>
                <th className="pb-3 pl-4">Document</th>
                <th className="pb-3">Project</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Chunks</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {documents.map((doc) => (
                <tr key={doc.documentId} className="theme-table-row transition-colors">
                  <td className="py-4 pl-4">
                    <div className="font-bold theme-title">{doc.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] theme-muted">{doc.documentId}</div>
                  </td>
                  <td className="py-4">
                    <span className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:text-blue-300">{doc.projectId}</span>
                  </td>
                  <td className="py-4">{doc.contentType}</td>
                  <td className="py-4 font-mono">{doc.chunkCount}</td>
                  <td className="py-4">
                    <StatusBadge variant={doc.status === 'active' ? 'ready' : 'failed'} label={doc.status} />
                  </td>
                  <td className="py-4 pr-4 theme-muted">{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center italic theme-muted">Bu proje için kayıtlı belge yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
