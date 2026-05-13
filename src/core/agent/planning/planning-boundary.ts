import { getPlanOnlyPolicyNotes, WORKSPACE_AGENT_PLANNING_POLICY } from "./planning-policy";
import {
  collectMaskWarnings,
  createPlanningWarningsForUnsafeIntent,
  sanitizePlanGoal,
  sanitizePlanRequest,
} from "./planning-sanitizer";
import type {
  WorkspaceAgentPlan,
  WorkspaceAgentPlanRequest,
  WorkspaceAgentPlanRisk,
  WorkspaceAgentPlanStep,
  WorkspaceAgentPlanWarning,
} from "./planning-types";

function detectUserGoalIntent(goal: string): {
  wantsEdit: boolean;
  wantsTest: boolean;
  isUnclear: boolean;
} {
  const lower = goal.toLowerCase();
  return {
    wantsEdit: /\b(edit|change|fix|patch|update|modify|write|save|create|yaz|degistir|değiştir|ekle|sil|oluştur|olustur|guncelle|güncelle)\b/i.test(lower),
    wantsTest: /\b(test|check|verify|run|build|smoke|lint|typecheck)\b/i.test(lower),
    isUnclear: goal.trim().length < 12 || /\b(thing|something|somehow|whatever)\b/i.test(lower),
  };
}

function buildStep(
  stepId: string,
  title: string,
  description: string,
  type: WorkspaceAgentPlanStep["type"],
  riskLevel: WorkspaceAgentPlanStep["riskLevel"],
  requiresPermission: boolean,
  warnings?: WorkspaceAgentPlanWarning[],
): WorkspaceAgentPlanStep {
  return {
    stepId,
    title,
    description,
    type,
    riskLevel,
    requiresPermission,
    executable: false,
    warnings,
  };
}

export function createWorkspaceAgentPlan(input: WorkspaceAgentPlanRequest): WorkspaceAgentPlan {
  const rawGoal = input.userGoal;
  const request = sanitizePlanRequest(input);
  const goal = request.userGoal;
  const goalWarnings = sanitizePlanGoal(rawGoal).warnings;
  const unsafeWarnings = createPlanningWarningsForUnsafeIntent(rawGoal);
  const intent = detectUserGoalIntent(rawGoal);
  const visibleContextWarnings = collectMaskWarnings(input.visibleContextSummary ?? "");

  const steps: WorkspaceAgentPlanStep[] = [];

  steps.push(
    buildStep(
      "step-1",
      "Goal ve kapsamı oku",
      "Kullanici hedefini planlama seviyesinde yorumla ve sadece güvenli plan sinyallerini çıkar.",
      "inspect",
      "low",
      false,
      goalWarnings,
    ),
  );

  if (request.visibleContextSummary) {
    steps.push(
      buildStep(
        "step-2",
        "Görünür bağlamı gözden geçir",
        "Yalnızca kullanıcının görünür context özetini planlama sinyali olarak değerlendir.",
        "manual_review",
        "low",
        false,
      ),
    );
  }

  if (intent.isUnclear) {
    steps.push(
      buildStep(
        "step-3",
        "Kullanıcıdan netleştirme iste",
        "Amaç belirsiz olduğu için eksik alanları kullanıcıdan iste.",
        "ask_user",
        "low",
        false,
        [{ code: "NEEDS_CLARIFICATION", message: "Goal is not specific enough for a precise plan." }],
      ),
    );
  } else {
    steps.push(
      buildStep(
        "step-3",
        "Plan alt adımlarını belirle",
        "Güvenli plan adımlarını, yürütme olmadan, açıklayıcı şekilde sırala.",
        "inspect",
        "low",
        false,
      ),
    );
  }

  if (intent.wantsEdit) {
    steps.push(
      buildStep(
        "step-4",
        "Düzenleme önerisi hazırla",
        "Bu adım yalnızca edit önerisi üretir; execution kapalıdır ve future permission gerekir.",
        "edit_proposal",
        "medium",
        true,
        [{ code: "EXPLICIT_PERMISSION_REQUIRED", message: "Edit proposals require explicit future permission." }],
      ),
    );
  }

  if (intent.wantsTest) {
    steps.push(
      buildStep(
        "step-5",
        "Test önerisi hazırla",
        "Bu adım yalnızca test önerisi üretir; execution kapalıdır ve future permission gerekir.",
        "test_proposal",
        "medium",
        true,
        [{ code: "EXPLICIT_PERMISSION_REQUIRED", message: "Test proposals require explicit future permission." }],
      ),
    );
  }

  if (steps.length < 3) {
    steps.push(
      buildStep(
        "step-6",
        "Manuel inceleme",
        "Planı kullanıcı onayı ve sonraki güvenli faz için manuel olarak gözden geçir.",
        "manual_review",
        "low",
        false,
      ),
    );
  }

  const sanitizedSteps = steps.slice(0, request.maxSteps && request.maxSteps > 0 ? request.maxSteps : 6);

  const risks: WorkspaceAgentPlanRisk[] = [
    {
      code: "no_execution_boundary",
      level: "low",
      message: "This phase is plan only; no execution boundary is available.",
    },
  ];

  if (intent.wantsEdit) {
    risks.push({
      code: "write_requires_future_permission",
      level: "medium",
      message: "Any file write is only a future proposal and requires explicit permission.",
    });
  }

  if (intent.wantsTest) {
    risks.push({
      code: "test_requires_future_permission",
      level: "medium",
      message: "Any test execution is only a future proposal and requires explicit permission.",
    });
  }

  if (intent.isUnclear) {
    risks.push({
      code: "scope_unclear",
      level: "high",
      message: "User goal is too unclear for a deterministic plan.",
    });
  }

  const warnings = [
    ...goalWarnings,
    ...unsafeWarnings,
    ...visibleContextWarnings,
  ];

  const status: WorkspaceAgentPlan["status"] = intent.isUnclear ? "needs_user_input" : "ready";

  return {
    mode: WORKSPACE_AGENT_PLANNING_POLICY.mode,
    status,
    summary: `Plan-only workspace agent plan created for sanitized goal: ${goal}`,
    request,
    steps: sanitizedSteps.map((step) => ({ ...step, executable: false })),
    warnings,
    risks,
    notes: getPlanOnlyPolicyNotes(),
  };
}
