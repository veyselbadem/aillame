'use client';

import React, { useState } from 'react';
import { WorkspaceAgentReviewSummary } from '../../core/agent/planning/plan-review-summary-types';
import { LuCopy, LuCheck, LuShieldAlert, LuFileText } from 'react-icons/lu';

interface Props {
  summary: WorkspaceAgentReviewSummary | null;
}

export function WorkspaceAgentReviewSummaryPanel({ summary }: Props) {
  const [copied, setCopied] = useState(false);

  if (!summary) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.safeTextPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Review Summary Export
          </p>
          <h2 className="mt-2 text-xl font-semibold">İnceleme Özeti Çıktısı</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-900">
          <LuShieldAlert className="h-3 w-3" />
          NON-PERSISTENT
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-teal-50/50 p-4 dark:bg-teal-950/20">
          <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">Approved</div>
          <div className="mt-1 text-xl font-bold text-teal-700 dark:text-teal-300">
            {summary.stats.approvedCount}
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50/50 p-4 dark:bg-rose-950/20">
          <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Rejected</div>
          <div className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">
            {summary.stats.rejectedCount}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
          <div className="text-[10px] font-semibold text-slate-500">Pending</div>
          <div className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-200">
            {summary.stats.pendingCount}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
          <div className="text-[10px] font-semibold text-slate-500">Total</div>
          <div className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-200">
            {summary.stats.totalSteps}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <LuFileText className="h-4 w-4" />
            Metin Önizlemesi
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
              copied
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
            }`}
          >
            {copied ? (
              <>
                <LuCheck className="h-3.5 w-3.5" />
                Kopyalandı
              </>
            ) : (
              <>
                <LuCopy className="h-3.5 w-3.5" />
                Özeti Kopyala
              </>
            )}
          </button>
        </div>
        <pre className="h-[240px] w-full overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-600 font-mono dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {summary.safeTextPreview}
        </pre>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200/50 bg-amber-50/30 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <LuShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200/80">
            <p className="font-bold">Güvenlik ve Gizlilik Notu:</p>
            <p className="mt-1">
              Bu özet hiçbir dosya yazma veya komut çalıştırma işlemi gerçekleştirmez. Tüm veriler yalnızca bu oturumda bellekte tutulur ve disk üzerine kaydedilmez. Kopyalanan metni güvenli bir alana manuel olarak yapıştırabilirsiniz. Otomatik gönderim özelliği devre dışıdır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
