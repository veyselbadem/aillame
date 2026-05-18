"use client";

import React from 'react';
import { useWorkspaceAgentExecutionReadinessPreview } from '../../hooks/useWorkspaceAgentExecutionReadinessPreview';
import { useWorkspaceAgentReadinessReview } from '../../hooks/useWorkspaceAgentReadinessReview';
import { WorkspaceAgentReadinessPreflightList } from './WorkspaceAgentReadinessPreflightList';
import { WorkspaceAgentPermissionRequirementList } from './WorkspaceAgentPermissionRequirementList';
import { WorkspaceAgentReadinessWarnings } from './WorkspaceAgentReadinessWarnings';
import { WorkspaceAgentReadinessReviewSummaryPanel } from './WorkspaceAgentReadinessReviewSummaryPanel';

export const WorkspaceAgentExecutionReadinessPreview: React.FC = () => {
  const { 
    inputs, 
    evaluate, 
    result,
    renderData, 
    isLoading, 
    error 
  } = useWorkspaceAgentExecutionReadinessPreview();

  const {
    reviewState,
    reviewSummary,
    handlePermissionReview,
    handlePreflightReview
  } = useWorkspaceAgentReadinessReview(result);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto">
      {/* Input Section */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="w-2 h-6 bg-indigo-500 rounded-full mr-3" />
            Execution Readiness Giriş
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan ID</label>
              <input 
                type="text"
                value={inputs.planId}
                onChange={(e) => inputs.setPlanId(e.target.value)}
                placeholder="Örn: plan_2024_01"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Approved Step IDs (virgülle ayır)</label>
                <input 
                  type="text"
                  value={inputs.approvedStepIdsText}
                  onChange={(e) => inputs.setApprovedStepIdsText(e.target.value)}
                  placeholder="step_1, step_3"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Reviewed Step IDs</label>
                <input 
                  type="text"
                  value={inputs.reviewedStepIdsText}
                  onChange={(e) => inputs.setReviewedStepIdsText(e.target.value)}
                  placeholder="step_1, step_2, step_3"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">User Visible Summary (Gözden Geçirme Özeti)</label>
              <textarea 
                value={inputs.userVisibleSummary}
                onChange={(e) => inputs.setUserVisibleSummary(e.target.value)}
                placeholder="Kullanıcıya gösterilecek olan güvenli özet metni..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmation Text (Onay Metni)</label>
              <textarea 
                value={inputs.userConfirmationText}
                onChange={(e) => inputs.setUserConfirmationText(e.target.value)}
                placeholder="Kullanıcının verdiği onay ifadesi..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
              />
            </div>

            <button 
              onClick={evaluate}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
            >
              {isLoading ? 'Analiz Ediliyor...' : 'Readiness Değerlendir'}
            </button>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/20">
            <div className="flex items-start">
              <span className="text-indigo-400 mr-3 text-lg">ℹ</span>
              <p className="text-[10px] text-indigo-300 leading-relaxed">
                Bu ekran yalnızca gelecekteki execution/file-write fazları için bir hazır bulunuşluk önizlemesidir. 
                <strong> Hiçbir dosya değiştirilmez ve hiçbir komut çalıştırılmaz.</strong> 
                Tüm işlemler in-memory gerçekleşir.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className="lg:col-span-7">
        {!renderData ? (
          <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
            <span className="text-4xl mb-4">🔍</span>
            <p className="text-sm">Analiz sonuçlarını görmek için formu doldurup butona tıklayın.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header / Status */}
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 blur-3xl ${
                renderData.statusColor === 'green' ? 'bg-green-500' : 
                renderData.statusColor === 'red' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">Status Report</div>
                  <h1 className={`text-3xl font-black ${
                    renderData.statusColor === 'green' ? 'text-green-400' : 
                    renderData.statusColor === 'red' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {renderData.status}
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Evaluated At</div>
                  <div className="text-xs text-slate-300 font-mono">{renderData.evaluatedAt}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-4">
                 <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                   renderData.isReadyForFuturePhase ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-slate-500/10 border-slate-500/50 text-slate-400'
                 }`}>
                   {renderData.isReadyForFuturePhase ? 'READY FOR FUTURE PHASE' : 'NOT READY FOR EXECUTION'}
                 </div>
                 <span className="text-[10px] text-slate-500 font-mono">ID: {renderData.planId}</span>
              </div>
            </div>

            {/* Review Summary Panel */}
            {reviewState && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">In-Memory Review Summary</h3>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    reviewState.status === 'reviewed' ? 'bg-green-500/20 text-green-400' : 
                    reviewState.status === 'in_review' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {reviewState.status.toUpperCase()}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'İzin İncelendi', value: reviewState.reviewedPermissionCount, total: reviewState.permissionReviews.length },
                    { label: 'Kontrol İncelendi', value: reviewState.reviewedPreflightCount, total: reviewState.preflightReviews.length },
                    { label: 'Uyarı Sayısı', value: reviewState.warningCount },
                    { label: 'Active Grant', value: '0 (BÜYÜK YASAK)', color: 'text-red-500' }
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-[10px] text-slate-500 mb-1">{stat.label}</div>
                      <div className={`text-sm font-black ${stat.color || 'text-slate-200'}`}>
                        {stat.total ? `${stat.value}/${stat.total}` : stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Exportable Summary */}
            {reviewSummary && reviewState && reviewState.status === 'reviewed' && (
              <WorkspaceAgentReadinessReviewSummaryPanel summary={reviewSummary} />
            )}

            {/* Warnings & Risks */}
            <WorkspaceAgentReadinessWarnings 
              warnings={renderData.warnings} 
              risks={renderData.risks} 
            />

            {/* Two Column Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorkspaceAgentReadinessPreflightList 
                checks={renderData.preflightChecks} 
                reviewState={reviewState}
                onReview={handlePreflightReview}
              />
              <WorkspaceAgentPermissionRequirementList 
                permissions={renderData.permissions} 
                reviewState={reviewState}
                onReview={handlePermissionReview}
              />
            </div>

            {/* Security Footer */}
            <div className="p-4 rounded-lg bg-red-950/10 border border-red-500/20 text-center">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">
                {renderData.securityNotice}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 text-sm">
            <strong>Hata:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};
