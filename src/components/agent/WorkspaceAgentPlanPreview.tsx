'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '../ui/StatusBadge';
import { requireAdminTokenOrRedirect } from '../../lib/admin-fetch';
import { useWorkspaceAgentPlanPreview } from '../../hooks/useWorkspaceAgentPlanPreview';
import { useWorkspaceAgentPlanReview } from '../../hooks/useWorkspaceAgentPlanReview';
import { WorkspaceAgentPlanStepItem } from './WorkspaceAgentPlanStepItem';
import { WorkspaceAgentPlanWarnings } from './WorkspaceAgentPlanWarnings';
import { WorkspaceAgentReviewSummaryPanel } from './WorkspaceAgentReviewSummaryPanel';

export function WorkspaceAgentPlanPreview() {
  const router = useRouter();
  const { userGoal, setUserGoal, isPlanning, error, preview, createPlan, plan } =
    useWorkspaceAgentPlanPreview();

  const { reviewState, updateStepReview, summary, exportedSummary } = useWorkspaceAgentPlanReview(plan);

  useEffect(() => {
    requireAdminTokenOrRedirect(router);
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="w-full rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 lg:w-[420px] lg:shrink-0">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-600 dark:text-teal-300">
                Workspace Agent Plan Preview
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Plan önizlemesi üret</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Bu ekran yalnızca plan önizlemesi üretir. Hiçbir dosya değiştirilmez, hiçbir komut
                çalıştırılmaz ve plan adımları otomatik uygulanmaz.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-100">
              Plan-only / no execution sınırı burada korunur. İleri adımlar, ayrı güvenlik
              fazlarında ele alınır.
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Kullanıcı hedefi
              </span>
              <textarea
                value={userGoal}
                onChange={(event) => setUserGoal(event.target.value)}
                rows={7}
                placeholder="Örn. workspace planı için güvenli bir düzenleme önerisi oluştur"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-900/40"
              />
            </label>

            <button
              type="button"
              onClick={createPlan}
              disabled={isPlanning}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPlanning ? 'Plan oluşturuluyor...' : 'Plan oluştur'}
            </button>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                {error}
              </div>
            )}

            {!preview && !error && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                Bir hedef girin ve plan önizlemesi oluşturun.
              </div>
            )}

            {summary && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  İnceleme Özeti
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-teal-50/50 p-3 dark:bg-teal-950/20">
                    <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">Approved</div>
                    <div className="mt-1 text-lg font-bold text-teal-700 dark:text-teal-300">{summary.approvedCount}</div>
                  </div>
                  <div className="rounded-xl bg-rose-50/50 p-3 dark:bg-rose-950/20">
                    <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Rejected</div>
                    <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">{summary.rejectedCount}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-[10px] font-semibold text-slate-500">Pending</div>
                    <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-200">{summary.pendingCount}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-[10px] font-semibold text-slate-500">Total</div>
                    <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-200">{summary.totalSteps}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 p-3 text-[10px] leading-relaxed text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200/70">
                  <strong>Not:</strong> Bu onaylar planı "çalıştırılabilir" yapmaz. Tüm adımlar executable=false olarak kalır.
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Preview status
                </p>
                <h2 className="mt-2 text-xl font-semibold">Plan durumu</h2>
              </div>
              <StatusBadge
                variant={preview?.statusTone ?? 'pending'}
                label={preview ? preview.status : 'empty'}
                pulse={isPlanning}
              />
            </div>

            {preview ? (
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Mode</div>
                  <div className="mt-2 text-sm font-semibold">{preview.mode}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Steps</div>
                  <div className="mt-2 text-sm font-semibold">{preview.totalSteps}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Warnings</div>
                  <div className="mt-2 text-sm font-semibold">{preview.totalWarnings}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Permission</div>
                  <div className="mt-2 text-sm font-semibold">
                    {preview.requiresPermissionCount} step
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                Plan henüz oluşturulmadı. Preview alanı burada görünecek.
              </div>
            )}

            {preview && (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {preview.summary}
                  </p>
                </div>

                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-100">
                  {preview.planOnlyNotice}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Goal
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {preview.userGoal}
                  </p>
                </div>
              </div>
            )}
          </section>

          {exportedSummary && (
            <WorkspaceAgentReviewSummaryPanel summary={exportedSummary} />
          )}

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Rendered plan steps
                </p>
                <h2 className="mt-2 text-xl font-semibold">Adım listesi</h2>
              </div>
              <StatusBadge variant="protected" label="executable=false" />
            </div>

            <div className="mt-5 space-y-4">
              {preview ? (
                preview.steps.length > 0 ? (
                  preview.steps.map((step) => {
                    const stepReview = reviewState?.stepReviews.find(
                      (sr) => sr.stepId === step.stepId
                    );
                    return (
                      <WorkspaceAgentPlanStepItem
                        key={step.stepId}
                        step={step}
                        reviewStatus={stepReview?.reviewStatus}
                        reviewNote={stepReview?.note}
                        onReviewUpdate={(status, note) => updateStepReview(step.stepId, status, note)}
                      />
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                    Bu plan için adım üretilemedi.
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                  Adımlar burada önizlenecek. Execute, Run, Apply veya Write file butonu bulunmaz.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Warnings & risks
                </p>
                <h2 className="mt-2 text-xl font-semibold">Uyarılar ve riskler</h2>
              </div>

              <div className="mt-5">
                {preview ? (
                  <WorkspaceAgentPlanWarnings warnings={preview.warnings} risks={preview.risks} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                    Uyarı ve riskler oluşturulunca burada gösterilir.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Safety notes
                </p>
                <h2 className="mt-2 text-xl font-semibold">Güvenlik notları</h2>
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {(preview?.safetyNotes ?? [
                  'Bu alan yalnızca önizleme amaçlıdır.',
                  'Hiçbir çıktı otomatik uygulanmaz.',
                  'Planlı yazma ve yürütme ayrı fazlarda ele alınır.',
                ]).map((note) => (
                  <li key={note} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}