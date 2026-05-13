import { createWorkspaceAgentPlan } from '../src/core/agent/planning';
import { createWorkspaceAgentPlanPreviewView } from '../src/core/agent/planning/plan-preview-presenter';
import { validateWorkspaceAgentPlanGoal } from '../src/hooks/useWorkspaceAgentPlanPreview';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function includesUnsafePreviewContent(value: string): boolean {
  return /"(?:fullPath|canonicalPath|physicalPath|stdout|stderr|pid)"|\bstack trace\b|\bActionExecutor\b|\bCommand Registry\b|\bwrite payload\b|\bshell command\b/i.test(value);
}

async function runSmokeTest() {
  console.log('Running Phase 48 Workspace Agent Plan Preview UI smoke tests...');

  assert(validateWorkspaceAgentPlanGoal('') !== null, 'Empty goal must fail validation.');
  assert(validateWorkspaceAgentPlanGoal('plan') === null, 'Valid short goal should pass validation.');

  const plan = createWorkspaceAgentPlan({
    mode: 'plan_only',
    userGoal: 'Workspace içinde /Users/demo/project için npm run build çalıştır ve src/app.ts dosyasını yaz',
    maxSteps: 6,
  });

  const preview = createWorkspaceAgentPlanPreviewView(plan);

  assert(plan.mode === 'plan_only', 'Plan mode must remain plan_only.');
  assert(plan.steps.every((step) => step.executable === false), 'All plan steps must remain non-executable.');
  assert(preview.mode === 'plan_only', 'Preview mode must remain plan_only.');
  assert(preview.steps.every((step) => step.executableLabel === 'false'), 'Preview steps must expose executable=false.');
  assert(preview.totalWarnings >= 1, 'Preview should expose warnings when command-like input is used.');
  assert(preview.totalRisks >= 1, 'Preview should expose risks.');
  assert(!includesUnsafePreviewContent(JSON.stringify(preview)), 'Preview data must not include unsafe execution or path content.');
  assert(!JSON.stringify(preview).includes('fullPath'), 'fullPath must not appear in preview data.');
  assert(!JSON.stringify(preview).includes('canonicalPath'), 'canonicalPath must not appear in preview data.');
  assert(!JSON.stringify(preview).includes('write payload'), 'write payload must not appear in preview data.');
  assert(!JSON.stringify(preview).includes('shell command'), 'shell command must not appear in preview data.');

  const safePlan = createWorkspaceAgentPlan({
    mode: 'plan_only',
    userGoal: 'Sadece plan önizlemesi oluştur',
  });
  const safePreview = createWorkspaceAgentPlanPreviewView(safePlan);

  assert(safePreview.planOnlyNotice.includes('plan önizlemesi'), 'Plan-only UX text should be present.');
  assert(safePreview.steps.every((step) => step.executableLabel === 'false'), 'Safe preview steps must remain non-executable.');

  console.log('Phase 48 workspace agent plan preview UI smoke tests passed.');
}

runSmokeTest().catch((error) => {
  console.error('Phase 48 workspace agent plan preview UI smoke tests failed:', error.message);
  process.exit(1);
});