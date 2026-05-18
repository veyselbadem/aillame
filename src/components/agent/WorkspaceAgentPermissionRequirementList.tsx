import React from 'react';

interface PermissionListProps {
  permissions: Array<{
    id: string;
    type: string;
    description: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    isSatisfied: boolean;
    isRequired: boolean;
  }>;
  reviewState?: any;
  onReview?: (id: string, status: any, note: string) => void;
}

export const WorkspaceAgentPermissionRequirementList: React.FC<PermissionListProps> = ({ 
  permissions, 
  reviewState, 
  onReview 
}) => {
  if (permissions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 flex justify-between items-center">
        Gerekli İzinler (Future)
        {reviewState && (
          <span className="text-[10px] font-normal text-slate-500 uppercase">
            In-Memory Review Only
          </span>
        )}
      </h3>
      <div className="grid gap-3">
        {permissions.map(perm => {
          const currentReview = reviewState?.permissionReviews?.find((r: any) => r.requirementId === perm.id);
          
          return (
            <div key={perm.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-inner">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-indigo-400 tracking-wide">{perm.type}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  perm.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                  perm.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  perm.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {perm.riskLevel.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed mb-4">{perm.description}</div>
              
              <div className="flex items-center text-[10px] mb-4 pb-4 border-b border-slate-800">
                <span className={`w-2 h-2 rounded-full mr-2 ${perm.isSatisfied ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={perm.isSatisfied ? 'text-green-400' : 'text-red-400 font-medium'}>
                  {perm.isSatisfied ? 'Sistem İzni Verildi' : 'Sistem İzni Yok (Readiness Only)'}
                </span>
              </div>

              {onReview && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'pending', label: 'Beklemede', color: 'slate' },
                      { id: 'acknowledged_for_future', label: 'Gelecek İçin Onaylandı', color: 'green' },
                      { id: 'needs_changes', label: 'Değişiklik Gerekli', color: 'yellow' },
                      { id: 'rejected', label: 'Reddet', color: 'red' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => onReview(perm.id, btn.id, currentReview?.note || '')}
                        className={`text-[9px] font-bold px-2 py-1 rounded transition-all border ${
                          currentReview?.reviewStatus === btn.id 
                            ? `bg-${btn.color}-500/20 border-${btn.color}-500/50 text-${btn.color}-400 shadow-[0_0_8px_rgba(0,0,0,0.5)]` 
                            : 'bg-slate-950/40 border-slate-700 text-slate-500 hover:border-slate-600'
                        }`}
                      >
                        {btn.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text"
                    value={currentReview?.note || ''}
                    onChange={(e) => onReview(perm.id, currentReview?.reviewStatus || 'pending', e.target.value)}
                    placeholder="İnceleme notu ekle (Opsiyonel)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500/50"
                  />
                  <div className="text-[9px] text-slate-600 italic">
                    * Bu işaretleme gerçek yetki vermez ve hiçbir işlemi başlatmaz.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
