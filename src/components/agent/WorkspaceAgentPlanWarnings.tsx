'use client';

import React from 'react';

interface Props {
  warnings: Array<{ code: string; message: string }>;
  risks: Array<{ code: string; level: string; message: string }>;
}

export function WorkspaceAgentPlanWarnings({ warnings, risks }: Props) {
  if (warnings.length === 0 && risks.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Bu plan için ek risk veya uyarı işaretlenmedi.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Uyarılar</h3>
          <ul className="mt-3 space-y-2 text-sm text-amber-800 dark:text-amber-100">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`} className="rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-900/60">
                {warning.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {risks.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">Riskler</h3>
          <ul className="mt-3 space-y-2 text-sm text-rose-800 dark:text-rose-100">
            {risks.map((risk, index) => (
              <li key={`${risk.code}-${index}`} className="rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-900/60">
                <span className="mr-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                  {risk.level}
                </span>
                {risk.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}