import React, { useState } from 'react';
import StatusBadge from '../ui/StatusBadge';
import { WorkspaceAgentPlanStepReviewStatus } from '../../core/agent/planning/plan-review-types';

interface Props {
  step: {
    stepId: string;
    title: string;
    description: string;
    type: string;
    riskLevel: string;
    requiresPermission: boolean;
    executableLabel: 'false';
    warnings: string[];
  };
  reviewStatus?: WorkspaceAgentPlanStepReviewStatus;
  reviewNote?: string;
  onReviewUpdate?: (status: WorkspaceAgentPlanStepReviewStatus, note?: string) => void;
}

export function WorkspaceAgentPlanStepItem({
  step,
  reviewStatus = 'pending',
  reviewNote = '',
  onReviewUpdate,
}: Props) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [localNote, setLocalNote] = useState(reviewNote);

  const handleStatusChange = (status: WorkspaceAgentPlanStepReviewStatus) => {
    onReviewUpdate?.(status, localNote);
  };

  const handleNoteSubmit = () => {
    onReviewUpdate?.(reviewStatus, localNote);
    setIsEditingNote(false);
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {step.stepId}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
            {step.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge
            variant={
              step.riskLevel === 'high' ? 'failed' : step.riskLevel === 'medium' ? 'warning' : 'neutral'
            }
            label={step.riskLevel}
          />
          <StatusBadge
            variant={step.requiresPermission ? 'review' : 'ready'}
            label={step.requiresPermission ? 'permission' : 'no permission'}
          />
          <StatusBadge variant="protected" label={step.executableLabel} />
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
          type: {step.type}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
          risk: {step.riskLevel}
        </span>
      </div>

      {step.warnings.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm text-amber-700 dark:text-amber-200">
          {step.warnings.map((warning, index) => (
            <li
              key={`${step.stepId}-warning-${index}`}
              className="rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40"
            >
              {warning}
            </li>
          ))}
        </ul>
      )}

      {/* Review Controls */}
      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Adım İncelemesi
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleStatusChange('pending')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                reviewStatus === 'pending'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              Beklemede
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('approved_for_future')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                reviewStatus === 'approved_for_future'
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              Gelecekte uygulanabilir
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('rejected')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                reviewStatus === 'rejected'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              Reddet
            </button>
          </div>
        </div>

        <div className="mt-3">
          {isEditingNote ? (
            <div className="space-y-2">
              <textarea
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                placeholder="İnceleme notu ekleyin... (Path ve Secretlar otomatik maskelenir)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-teal-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleNoteSubmit}
                  className="rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  Notu Kaydet
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
              <p className="text-[11px] italic text-slate-600 dark:text-slate-400">
                {reviewNote || 'İnceleme notu eklenmedi.'}
              </p>
              <button
                type="button"
                onClick={() => setIsEditingNote(true)}
                className="text-[10px] font-bold uppercase text-teal-600 opacity-0 transition group-hover:opacity-100 dark:text-teal-400"
              >
                {reviewNote ? 'Düzenle' : 'Not Ekle'}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}