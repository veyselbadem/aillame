import React from 'react';

interface WarningsProps {
  warnings: Array<{ code: string; message: string }>;
  risks: Array<{ code: string; level: string; message: string }>;
}

export const WorkspaceAgentReadinessWarnings: React.FC<WarningsProps> = ({ warnings, risks }) => {
  if (warnings.length === 0 && risks.length === 0) return null;

  return (
    <div className="space-y-4">
      {risks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-400">Kritik Riskler</h3>
          {risks.map((risk, i) => (
            <div key={i} className="p-3 rounded bg-red-900/20 border border-red-500/30 text-red-200">
              <div className="text-[10px] font-black mb-1">[{risk.code}] LEVEL: {risk.level}</div>
              <div className="text-xs">{risk.message}</div>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-yellow-400">Uyarılar</h3>
          {warnings.map((warning, i) => (
            <div key={i} className="p-3 rounded bg-yellow-900/10 border border-yellow-500/20 text-yellow-100">
              <div className="text-[10px] font-bold mb-1">[{warning.code}]</div>
              <div className="text-xs">{warning.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
