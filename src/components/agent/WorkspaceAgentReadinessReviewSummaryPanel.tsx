"use client";

import React, { useState } from 'react';
import { WorkspaceAgentReadinessReviewSummary } from '../../core/agent/execution-readiness/readiness-review-summary-types';

interface SummaryPanelProps {
  summary: WorkspaceAgentReadinessReviewSummary;
}

export const WorkspaceAgentReadinessReviewSummaryPanel: React.FC<SummaryPanelProps> = ({ summary }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary.safeTextPreview).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="w-2 h-6 bg-green-500 rounded-full mr-3" />
          Readiness Review Özet Çıktısı
        </h2>
        <button 
          onClick={copyToClipboard}
          className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            copied ? 'bg-green-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          {copied ? '✓ KOPYALANDI' : '📋 ÖZETİ KOPYALA'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gelecek Onayı', value: summary.stats.acknowledgedPermissions, color: 'text-green-400' },
          { label: 'Değişiklik/Red', value: summary.stats.needsChangesPermissions + summary.stats.rejectedPermissions, color: 'text-red-400' },
          { label: 'Bekleyen', value: summary.stats.pendingPermissions, color: 'text-slate-500' },
          { label: 'Active Grant', value: 0, color: 'text-red-500 font-black' }
        ].map((stat, i) => (
          <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800/50 text-center">
            <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest">{stat.label}</div>
            <div className={`text-lg font-black ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <pre className="relative p-4 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
          {summary.safeTextPreview}
        </pre>
      </div>

      <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20">
        <div className="flex items-center">
          <span className="text-red-500 mr-3 text-lg">⚠️</span>
          <p className="text-[10px] font-bold text-red-300 uppercase tracking-tight">
            BU ÖZET HİÇBİR İZİN VERMEZ VE HİÇBİR ŞEYİ ÇALIŞTIRMAZ. 
            TÜM İZİNLER 'SATISFIED=FALSE' KALMAYA DEVAM EDER.
          </p>
        </div>
      </div>
    </div>
  );
};
