import React from 'react';

interface PreflightListProps {
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "warning" | "blocked";
    message: string;
    isBlocking: boolean;
  }>;
  reviewState?: any;
  onReview?: (id: string, status: any, note: string) => void;
}

export const WorkspaceAgentReadinessPreflightList: React.FC<PreflightListProps> = ({ 
  checks,
  reviewState,
  onReview
}) => {
  if (checks.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300">Preflight Checks</h3>
      <div className="grid gap-2">
        {checks.map(check => {
          const currentReview = reviewState?.preflightReviews?.find((r: any) => r.checkId === check.id);

          return (
            <div key={check.id} className="p-3 rounded bg-slate-800/50 border border-slate-700">
              <div className="flex items-start mb-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                  check.status === 'pass' ? 'bg-green-500' : 
                  check.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <div className="text-xs font-medium text-slate-200">{check.label}</div>
                  <div className="text-[10px] text-slate-400">{check.message}</div>
                </div>
              </div>

              {onReview && (
                <div className="pl-5 space-y-2 border-l border-slate-700">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'pending', label: 'Beklemede', color: 'slate' },
                      { id: 'acknowledged', label: 'İncelendi', color: 'blue' },
                      { id: 'needs_changes', label: 'Düzeltme Gerekli', color: 'yellow' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => onReview(check.id, btn.id, currentReview?.note || '')}
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded transition-all border ${
                          currentReview?.reviewStatus === btn.id 
                            ? `bg-${btn.color}-500/20 border-${btn.color}-500/40 text-${btn.color}-400` 
                            : 'bg-slate-950/20 border-slate-800 text-slate-600 hover:border-slate-700'
                        }`}
                      >
                        {btn.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text"
                    value={currentReview?.note || ''}
                    onChange={(e) => onReview(check.id, currentReview?.reviewStatus || 'pending', e.target.value)}
                    placeholder="Not..."
                    className="w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[9px] text-slate-400 focus:outline-none focus:border-slate-700"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
