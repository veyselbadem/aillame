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
    <div className="min-h-screen bg-[#050505] p-8 text-slate-300 font-sans">
      <div className="mb-10 flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-light tracking-widest text-white uppercase">
            <RiFileList3Line className="mr-4 text-emerald-500" />
            Document Library
          </h1>
          <p className="mt-2 text-sm text-slate-500">Persistent RAG memory, document ingestion and project-based isolation.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10 transition-colors">
            <RiUploadCloud2Line /> Ingest Document
          </button>
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          ['Total Docs', documents.length.toString()],
          ['Active', documents.filter(d => d.status === 'active').length.toString()],
          ['Chunks', documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0).toString()],
          ['Storage', 'JSONL Persistent'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600">{label}</p>
            <p className="mt-2 text-xl font-bold text-slate-200">{value}</p>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
            <RiHistoryLine className="mr-2" /> Document Repository
          </h3>
          <div className="relative">
            <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search library..." className="rounded-lg bg-black/50 border border-white/5 pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-600">
              <tr>
                <th className="pb-3 pl-4">Document</th>
                <th className="pb-3">Project</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Chunks</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {documents.map((doc) => (
                <tr key={doc.documentId} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 pl-4">
                    <div className="font-bold text-slate-200">{doc.title}</div>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">{doc.documentId}</div>
                  </td>
                  <td className="py-4">
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-400 font-mono text-[10px]">{doc.projectId}</span>
                  </td>
                  <td className="py-4">{doc.contentType}</td>
                  <td className="py-4 font-mono">{doc.chunkCount}</td>
                  <td className="py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${doc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-600 italic">No documents found in library.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
