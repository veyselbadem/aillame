'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiRefreshCw, 
  FiPackage, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiDownload, 
  FiTrash2, 
  FiPlay, 
  FiXCircle, 
  FiInfo,
  FiCpu,
  FiHardDrive
} from 'react-icons/fi';
import { 
  fetchGgufCatalog, 
  createGgufDownloadJob, 
  fetchGgufDownloadJobs, 
  approveGgufDownloadJob, 
  cancelGgufDownloadJob, 
  fetchInstalledGgufModels, 
  selectActiveGgufModel 
} from '@/lib/model-library-client';
import type { ModelCatalogEntry } from '@/core/models/catalog/model-catalog-types';
import type { ModelDownloadJob } from '@/core/models/download/model-download-types';
import type { VerifiedGgufModel } from '@/core/models/download/model-verification-service';
import type { ActiveGgufModelRecord } from '@/core/models/download/active-gguf-model-service';

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function GgufModelManager() {
  const [catalog, setCatalog] = useState<ModelCatalogEntry[]>([]);
  const [jobs, setJobs] = useState<ModelDownloadJob[]>([]);
  const [installed, setInstalled] = useState<VerifiedGgufModel[]>([]);
  const [activeModel, setActiveModel] = useState<ActiveGgufModelRecord | undefined>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catData, jobsData, installedData] = await Promise.all([
        fetchGgufCatalog(),
        fetchGgufDownloadJobs(),
        fetchInstalledGgufModels(),
      ]);
      setCatalog(catData);
      setJobs(jobsData);
      setInstalled(installedData.models);
      setActiveModel(installedData.activeModel);
    } catch (err) {
      setError('Data loading failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownload = async (modelId: string, fileName: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createGgufDownloadJob(modelId, fileName);
      if (result.success) {
        setMessage('Download job created. It requires approval.');
        await loadData();
      } else {
        setError(result.error || 'Job creation failed.');
      }
    } catch (err) {
      setError('Unexpected error during job creation.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (jobId: string) => {
    setBusy(true);
    try {
      const result = await approveGgufDownloadJob(jobId);
      if (result.success) {
        setMessage('Job approved.');
        await loadData();
      } else {
        setError(result.message || 'Approval failed.');
      }
    } catch (err) {
      setError('Approval error.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (jobId: string) => {
    setBusy(true);
    try {
      const result = await cancelGgufDownloadJob(jobId);
      if (result.success) {
        setMessage('Job cancelled.');
        await loadData();
      } else {
        setError(result.message || 'Cancellation failed.');
      }
    } catch (err) {
      setError('Cancellation error.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetActive = async (modelId: string, filePath: string) => {
    setBusy(true);
    try {
      const result = await selectActiveGgufModel(modelId, filePath);
      if (result.success) {
        setMessage('Active model updated.');
        await loadData();
      } else {
        setError(result.error || 'Selection failed.');
      }
    } catch (err) {
      setError('Selection error.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center animate-pulse">
        <FiRefreshCw className="mx-auto mb-2 animate-spin theme-muted" size={24} />
        <p className="text-sm theme-muted">GGUF Manager loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          <FiAlertCircle className="shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <FiCheckCircle className="shrink-0" />
          <p>{message}</p>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Active Model Status */}
      <section className="theme-surface rounded-2xl border border-indigo-500/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-base font-bold theme-title">
            <FiPlay className="text-indigo-500" />
            Aktif GGUF Modeli
          </h2>
          {activeModel && (
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${activeModel.verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {activeModel.verified ? 'Verified' : 'Unverified'}
            </span>
          )}
        </div>
        {activeModel ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="theme-elevated rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest theme-muted mb-1">Model ID / Name</p>
              <p className="text-sm font-bold theme-title">{activeModel.modelId}</p>
              <p className="mt-2 text-[10px] font-mono theme-muted break-all">{activeModel.filePath}</p>
            </div>
            <div className="theme-elevated rounded-xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest theme-muted mb-1">Selection Source</p>
                <p className="text-xs font-bold theme-secondary">{activeModel.source === 'env' ? 'Environment Variables' : 'Persistent Store'}</p>
              </div>
              <p className="mt-2 text-[9px] theme-muted">Selected at: {new Date(activeModel.selectedAt).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center theme-elevated rounded-xl border-dashed">
            <FiInfo className="mx-auto mb-2 opacity-40" size={20} />
            <p className="text-sm theme-muted italic">Aktif model seçilmedi veya yapılandırılmadı.</p>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Discover / Catalog */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest theme-muted">
              <FiPackage />
              Discover / Catalog
            </h2>
            <FiInfo className="opacity-40 hover:opacity-100 cursor-help" title="Curated GGUF candidates optimized for Aillame local runtimes." />
          </div>
          <div className="grid gap-3">
            {catalog.map(entry => (
              <div key={entry.modelId} className="theme-surface rounded-xl p-4 border border-white/5 transition-all hover:border-indigo-500/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold theme-title">{entry.displayName}</h3>
                    <p className="text-[10px] theme-muted mt-0.5">{entry.provider} · {entry.family}</p>
                  </div>
                  <span className="text-[10px] font-bold theme-secondary px-2 py-0.5 rounded-lg bg-white/5">
                    {entry.compatibility.score * 100}% Fit
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {entry.files.map(file => (
                    <div key={file.fileName} className="flex items-center justify-between text-xs p-2 rounded-lg theme-elevated bg-white/[0.02]">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-mono text-[10px] theme-title truncate">{file.fileName}</p>
                        <p className="text-[9px] theme-muted">{formatBytes(file.sizeBytes)}</p>
                      </div>
                      <button 
                        disabled={busy}
                        onClick={() => handleDownload(entry.modelId, file.fileName)}
                        className="p-1.5 rounded-md hover:bg-indigo-500/10 text-indigo-500 transition-colors disabled:opacity-30"
                        title="Start Download Job"
                      >
                        <FiDownload size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Jobs & Queue */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest theme-muted px-2">
            <FiRefreshCw />
            Jobs & Queue
          </h2>
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="py-12 text-center theme-surface rounded-xl border-dashed opacity-40">
                <p className="text-xs theme-muted italic">Aktif iş kuyruğu boş.</p>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.jobId} className="theme-surface rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono theme-muted">#{job.jobId.slice(-8)}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      job.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                      job.status === 'waiting-approval' ? 'bg-amber-500/10 text-amber-500' :
                      job.status === 'manual-required' ? 'bg-indigo-500/10 text-indigo-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold theme-title truncate mb-1">{job.fileName}</p>
                  <p className="text-[10px] theme-muted mb-3">{formatBytes(job.totalBytes)}</p>
                  
                  {job.status === 'waiting-approval' && (
                    <div className="flex gap-2">
                      <button 
                        disabled={busy}
                        onClick={() => handleApprove(job.jobId)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500 transition-colors disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button 
                        disabled={busy}
                        onClick={() => handleCancel(job.jobId)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {job.status === 'manual-required' && (
                    <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-[9px] text-indigo-400 font-medium leading-relaxed">
                        <FiInfo className="inline mr-1" />
                        Network download is disabled or required for this job. Please place the file in the library directory manually.
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Installed Models */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest theme-muted px-2">
          <FiHardDrive />
          Installed GGUF Models
        </h2>
        <div className="theme-surface rounded-2xl overflow-hidden border border-white/5">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-white/5 theme-muted">
                <th className="px-6 py-3 font-bold uppercase tracking-wider">File Name</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider">Quant</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {installed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center theme-muted italic">
                    Kütüphanede yüklü model bulunamadı.
                  </td>
                </tr>
              ) : (
                installed.map(model => (
                  <tr key={model.filePath} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 theme-title font-mono text-[11px] truncate max-w-[300px]" title={model.filePath}>
                      {model.fileName}
                    </td>
                    <td className="px-6 py-4 theme-secondary uppercase">{model.quantization || 'unknown'}</td>
                    <td className="px-6 py-4 theme-muted">{formatBytes(model.sizeBytes)}</td>
                    <td className="px-6 py-4">
                      {model.verified ? (
                        <span className="flex items-center gap-1 text-emerald-500 font-bold">
                          <FiCheckCircle size={12} />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-bold" title={model.errors.join(', ')}>
                          <FiAlertCircle size={12} />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        disabled={busy || !model.verified || activeModel?.filePath === model.filePath}
                        onClick={() => handleSetActive(model.fileName, model.filePath)}
                        className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-bold hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-20"
                      >
                        {activeModel?.filePath === model.filePath ? 'Active' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
