import type {
  WorkspaceAgentPlan,
  WorkspaceAgentPlanRisk,
  WorkspaceAgentPlanStep,
  WorkspaceAgentPlanWarning,
} from "./planning-types";

export type WorkspaceAgentPlanPreviewStatusTone = "pending" | "ready" | "warning" | "failed" | "neutral";

export type WorkspaceAgentPlanPreviewStepView = {
  stepId: string;
  title: string;
  description: string;
  type: WorkspaceAgentPlanStep["type"];
  riskLevel: WorkspaceAgentPlanStep["riskLevel"];
  requiresPermission: boolean;
  executableLabel: "false";
  warnings: string[];
};

export type WorkspaceAgentPlanPreviewView = {
  mode: WorkspaceAgentPlan["mode"];
  status: WorkspaceAgentPlan["status"];
  statusTone: WorkspaceAgentPlanPreviewStatusTone;
  summary: string;
  userGoal: string;
  totalSteps: number;
  totalWarnings: number;
  totalRisks: number;
  requiresPermissionCount: number;
  planOnlyNotice: string;
  safetyNotes: string[];
  warnings: WorkspaceAgentPlanWarning[];
  risks: WorkspaceAgentPlanRisk[];
  steps: WorkspaceAgentPlanPreviewStepView[];
};

const MASKED_PATTERNS = [
  /fullPath/gi,
  /canonicalPath/gi,
  /physical path/gi,
  /stdout/gi,
  /stderr/gi,
  /PID/gi,
  /stack trace/gi,
  /hidden prompt/gi,
  /system prompt/gi,
  /ActionExecutor/gi,
  /Command Registry/gi,
];

function sanitizePreviewText(text: string): string {
  return MASKED_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "[MASKED]"),
    text,
  ).replace(/\s+/g, " ").trim();
}

export function createWorkspaceAgentPlanPreviewView(plan: WorkspaceAgentPlan): WorkspaceAgentPlanPreviewView {
  const steps = plan.steps.map((step) => ({
    stepId: sanitizePreviewText(step.stepId),
    title: sanitizePreviewText(step.title),
    description: sanitizePreviewText(step.description),
    type: step.type,
    riskLevel: step.riskLevel,
    requiresPermission: step.requiresPermission,
    executableLabel: "false" as const,
    warnings: (step.warnings ?? []).map((warning) => sanitizePreviewText(warning.message)),
  }));

  return {
    mode: plan.mode,
    status: plan.status,
    statusTone: plan.status === "ready"
      ? "ready"
      : plan.status === "needs_user_input"
        ? "warning"
        : plan.status === "blocked"
          ? "failed"
          : plan.status === "draft"
            ? "pending"
            : "neutral",
    summary: sanitizePreviewText(plan.summary),
    userGoal: sanitizePreviewText(plan.request.userGoal),
    totalSteps: steps.length,
    totalWarnings: plan.warnings.length,
    totalRisks: plan.risks.length,
    requiresPermissionCount: steps.filter((step) => step.requiresPermission).length,
    planOnlyNotice: "Bu ekran yalnızca plan önizlemesi üretir. Hiçbir dosya değiştirilmez, hiçbir komut çalıştırılmaz ve plan adımları otomatik uygulanmaz.",
    safetyNotes: [
      "Plan-only / no execution sınırı korunur.",
      "Görünür sonuçlar kullanıcı onayı olmadan uygulanmaz.",
      "Gelecekteki yazma ve uygulama yetkileri ayrı güvenlik fazlarında ele alınır.",
    ],
    warnings: plan.warnings.map((warning) => ({
      code: warning.code,
      message: sanitizePreviewText(warning.message),
    })),
    risks: plan.risks.map((risk) => ({
      code: risk.code,
      level: risk.level,
      message: sanitizePreviewText(risk.message),
    })),
    steps,
  };
}