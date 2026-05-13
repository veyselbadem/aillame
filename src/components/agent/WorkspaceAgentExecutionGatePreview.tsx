import React from 'react';
import { useWorkspaceAgentExecutionGatePreview } from '../../hooks/useWorkspaceAgentExecutionGatePreview';
import { useWorkspaceAgentGateReview } from '../../hooks/useWorkspaceAgentGateReview';
import { 
  WorkspaceAgentGateCheckList, 
  WorkspaceAgentGateWarnings, 
  WorkspaceAgentGateDecisionCard 
} from './WorkspaceAgentGateSubComponents';
import { WorkspaceAgentGateReviewSummaryPanel } from './WorkspaceAgentGateReviewSummaryPanel';

export const WorkspaceAgentExecutionGatePreview: React.FC = () => {
  const gate = useWorkspaceAgentExecutionGatePreview();
  const review = useWorkspaceAgentGateReview(gate.rawResult || null); // Note: Hook needs raw result

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Workspace Agent Execution Gate Preview</h1>
        <p className="text-gray-500 mt-1">Gelecekteki yürütme (execution) istekleri için güvenlik katmanı denetimi.</p>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm font-medium">
          ⚠️ <strong>GÜVENLİK NOTU:</strong> Bu ekran yalnızca bir simülasyondur. Hiçbir yürütme işlemi yapılmaz, hiçbir dosya değiştirilmez ve hiçbir gerçek yetki (permission grant) verilmez.
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <section className="space-y-6">
          {/* ... inputs ... */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-l-4 border-gray-400 pl-3">Request Metadata</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Request ID</label>
                <input 
                  type="text" 
                  value={gate.requestId} 
                  onChange={(e) => gate.setRequestId(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plan ID</label>
                <input 
                  type="text" 
                  placeholder="plan-..." 
                  value={gate.planId} 
                  onChange={(e) => gate.setPlanId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Readiness Status</label>
              <select 
                value={gate.readinessStatus} 
                onChange={(e) => gate.setReadinessStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="ready_for_future_review">ready_for_future_review</option>
                <option value="not_ready">not_ready</option>
                <option value="blocked">blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reviewed / Approved Steps (CSV)</label>
              <input 
                type="text" 
                placeholder="1, 2, 3" 
                onChange={(e) => gate.setApprovedStepIds(e.target.value.split(',').map(s => s.trim()))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-l-4 border-gray-400 pl-3">Intent & Summary</h2>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Visible Summary</label>
              <textarea 
                rows={3}
                placeholder="Agent ne yapacak? (Örn: Write to test.ts)"
                value={gate.userVisibleSummary}
                onChange={(e) => gate.setUserVisibleSummary(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmation Text</label>
              <textarea 
                rows={2}
                placeholder="Kullanıcı neyi onaylıyor? (Örn: I confirm path C:\secrets)"
                value={gate.userConfirmationText}
                onChange={(e) => gate.setUserConfirmationText(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={gate.checkGate}
              disabled={gate.isLoading}
              className="flex-1 py-3 px-6 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
            >
              {gate.isLoading ? 'KONTROL EDİLİYOR...' : 'GATE KONTROL ET'}
            </button>
            <button 
              onClick={gate.reset}
              className="py-3 px-6 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              SIFIRLA
            </button>
          </div>

          {/* Review Summary Panel */}
          {review.reviewState && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white space-y-4 animate-in zoom-in-95 duration-300">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">İnceleme Özeti</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                  <div className="text-[10px] font-bold text-gray-400 uppercase">İncelenen Kontrol</div>
                  <div className="text-xl font-black">{review.reviewState.reviewedCheckCount}/{review.reviewState.checkReviews.length}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                  <div className="text-[10px] font-bold text-gray-400 uppercase">İncelenen Risk</div>
                  <div className="text-xl font-black">{review.reviewState.reviewedRiskCount}/{review.reviewState.riskReviews.length}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-900 bg-opacity-30 border border-red-800 rounded-lg">
                <span className="text-xs font-bold uppercase">Aktif Capability Sayısı</span>
                <span className="text-lg font-black text-red-400">0</span>
              </div>
              <p className="text-[10px] text-gray-400 italic text-center font-medium">
                * İncelendi işaretlemesi "capability" üretmez; canExecute false kalmaya devam eder.
              </p>
            </div>
          )}

          {/* New Summary Panel */}
          <WorkspaceAgentGateReviewSummaryPanel summary={review.summary} />
        </section>

        {/* Output Section */}
        <section className="space-y-6">
          {!gate.renderData && !gate.error && (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
              <div>
                <p className="text-xl font-bold mb-2">Henüz Kontrol Yapılmadı</p>
                <p className="text-sm">Parametreleri doldurup "Gate Kontrol Et" butonuna basınız.</p>
              </div>
            </div>
          )}

          {gate.error && (
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl text-red-800">
              <h3 className="font-bold text-lg mb-2">Hata Oluştu</h3>
              <p>{gate.error}</p>
            </div>
          )}

          {gate.renderData && review.reviewState && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <WorkspaceAgentGateDecisionCard 
                data={gate.renderData} 
                review={review.reviewState.decisionReview}
                onReview={review.updateDecision}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WorkspaceAgentGateCheckList 
                  checks={gate.renderData.checks} 
                  reviews={review.reviewState.checkReviews}
                  onReview={review.updateCheck}
                />
                <WorkspaceAgentGateWarnings 
                  warnings={gate.renderData.warnings} 
                  risks={gate.renderData.risks} 
                  riskReviews={review.reviewState.riskReviews}
                  onRiskReview={review.updateRisk}
                />
              </div>

              <div className="p-4 bg-gray-100 rounded-lg text-xs text-gray-500 font-mono overflow-auto">
                <div className="font-bold mb-2 uppercase tracking-widest text-[10px]">Review State Preview (Internal)</div>
                <pre>{JSON.stringify({
                  status: review.reviewState.status,
                  reviewedCheckCount: review.reviewState.reviewedCheckCount,
                  reviewedRiskCount: review.reviewState.reviewedRiskCount
                }, null, 2)}</pre>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="pt-8 border-t text-center text-gray-400 text-xs">
        &copy; 2026 Aillame Workspace Agent Execution Gate | Readiness-Only | No-Grant | No-Capability
      </footer>
    </div>
  );
};
