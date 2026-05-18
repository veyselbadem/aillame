import React from 'react';
import { WorkspaceAgentGateReviewSummary } from '../../core/agent/execution-gate/gate-review-summary-types';

export const WorkspaceAgentGateReviewSummaryPanel: React.FC<{ 
  summary: WorkspaceAgentGateReviewSummary | null 
}> = ({ summary }) => {
  if (!summary) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary.safeTextPreview);
    alert('Özet panoya kopyalandı.');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-500">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">Gate Review Özet Çıktısı</h3>
        <button 
          onClick={copyToClipboard}
          className="px-3 py-1 bg-gray-900 text-white text-[10px] font-bold rounded hover:bg-black transition-colors"
        >
          METNİ KOPYALA
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">İncelendi</div>
            <div className="text-lg font-black text-gray-800">{summary.stats.acknowledgedCount}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Değişiklik</div>
            <div className="text-lg font-black text-amber-600">{summary.stats.needsChangesCount}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reddedildi</div>
            <div className="text-lg font-black text-red-600">{summary.stats.rejectedCount}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Capability</div>
            <div className="text-lg font-black text-red-400">0</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Güvenli Metin Önizleme</h4>
          <pre className="p-4 bg-gray-900 text-green-400 text-[11px] font-mono rounded-lg overflow-x-auto whitespace-pre-wrap border border-gray-800 shadow-inner max-h-60">
            {summary.safeTextPreview}
          </pre>
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-[10px] text-red-800 font-bold text-center leading-tight">
            ⚠️ BU ÖZET HİÇBİR CAPABILITY VERMEZ VE HİÇBİR ŞEYİ ÇALIŞTIRMAZ. 
            CANEXECUTE, CANWRITE VE CANRUNSHELL DEĞERLERİ FALSE KALIR.
          </p>
        </div>
      </div>
    </div>
  );
};
