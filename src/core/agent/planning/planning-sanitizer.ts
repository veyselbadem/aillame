import type { WorkspaceAgentPlanRequest, WorkspaceAgentPlanStep, WorkspaceAgentPlanWarning } from "./planning-types";

const MAX_GOAL_LENGTH = 220;
const PATH_PATTERN = /(?:[A-Za-z]:\\|\.\.\\|\.\.\/|\/(?:[^\s/]+\/)+[^\s/]+)/g;
const RELATIVE_PATH_PATTERN = /(?:\b[\w.-]+(?:[\\/][\w.-]+)+\b)/g;
const SECRET_PATTERN = /(?:api[_-]?key|secret|token|password|passwd|private[_-]?key|bearer\s+[A-Za-z0-9._-]+)/gi;
const COMMAND_LIKE_PATTERN = /(?:\b(?:npm|node|npx|pnpm|yarn|cargo|git|bash|sh|powershell|cmd|curl|wget)\b|\|\||&&|;|`)/i;
const FILE_WRITE_PATTERN = /(?:\bwrite\b|\boverwrite\b|\bsave\b|\bcreate\b|\bmodify\b|\bpatch\b|\bchange\b|\byaz\b|\bdegistir\b|\bdeğiştir\b|\bekle\b|\bsil\b|\boluştur\b|\bolustur\b|\bguncelle\b|\bgüncelle\b)/i;

function maskPatterns(input: string): string {
  return input
    .replace(RELATIVE_PATH_PATTERN, "[PATH_MASKED]")
    .replace(PATH_PATTERN, "[PATH_MASKED]")
    .replace(SECRET_PATTERN, "[SECRET_MASKED]")
    .replace(COMMAND_LIKE_PATTERN, "[COMMAND_MASKED]")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePlanGoal(goal: string): {
  value: string;
  warnings: WorkspaceAgentPlanWarning[];
} {
  const warnings: WorkspaceAgentPlanWarning[] = [];
  let value = maskPatterns(goal);

  if (goal.length > MAX_GOAL_LENGTH) {
    warnings.push({ code: "LONG_GOAL", message: "userGoal too long; truncated for planning safety." });
    value = value.slice(0, MAX_GOAL_LENGTH).trim();
  }

  if (COMMAND_LIKE_PATTERN.test(goal)) {
    warnings.push({ code: "COMMAND_LIKE_INPUT", message: "Command-like input detected; treated as non-executable planning text." });
  }

  if (FILE_WRITE_PATTERN.test(goal)) {
    warnings.push({ code: "FILE_WRITE_INTENT", message: "File-write intent detected; any write proposal requires explicit future permission." });
  }

  if (SECRET_PATTERN.test(goal)) {
    warnings.push({ code: "SECRET_PATTERN", message: "Potential secret pattern masked in planning input." });
  }

  if (PATH_PATTERN.test(goal)) {
    warnings.push({ code: "PATH_PATTERN", message: "Path-like content masked in planning input." });
  }

  return { value, warnings };
}

export function collectMaskWarnings(input: string): WorkspaceAgentPlanWarning[] {
  const warnings: WorkspaceAgentPlanWarning[] = [];

  if (SECRET_PATTERN.test(input)) {
    warnings.push({ code: "SECRET_PATTERN", message: "Potential secret pattern masked in planning input." });
  }

  if (PATH_PATTERN.test(input) || RELATIVE_PATH_PATTERN.test(input)) {
    warnings.push({ code: "PATH_PATTERN", message: "Path-like content masked in planning input." });
  }

  return warnings;
}

export function sanitizeVisibleContextSummary(summary?: string): string | undefined {
  if (!summary) {
    return undefined;
  }

  return maskPatterns(summary).slice(0, 180);
}

export function sanitizePlanStep(step: WorkspaceAgentPlanStep): WorkspaceAgentPlanStep {
  return {
    ...step,
    description: maskPatterns(step.description),
    executable: false,
    warnings: step.warnings?.map((warning) => ({
      code: warning.code,
      message: maskPatterns(warning.message),
    })),
  };
}

export function sanitizePlanRequest(request: WorkspaceAgentPlanRequest): WorkspaceAgentPlanRequest {
  const goal = sanitizePlanGoal(request.userGoal);

  return {
    mode: "plan_only",
    userGoal: goal.value,
    visibleContextSummary: sanitizeVisibleContextSummary(request.visibleContextSummary),
    allowedScope: request.allowedScope
      ? {
          label: maskPatterns(request.allowedScope.label).slice(0, 60),
          description: maskPatterns(request.allowedScope.description).slice(0, 160),
          allowedCategories: request.allowedScope.allowedCategories,
          requiresExplicitPermission: request.allowedScope.requiresExplicitPermission,
        }
      : undefined,
    maxSteps: request.maxSteps,
  };
}

export function createPlanningWarningsForUnsafeIntent(goal: string): WorkspaceAgentPlanWarning[] {
  const warnings: WorkspaceAgentPlanWarning[] = [];

  if (FILE_WRITE_PATTERN.test(goal)) {
    warnings.push({ code: "EXPLICIT_PERMISSION_REQUIRED", message: "Write-related intent is only a proposal in this phase and requires explicit future permission." });
  }

  if (COMMAND_LIKE_PATTERN.test(goal)) {
    warnings.push({ code: "NEEDS_CLARIFICATION", message: "Command-like request cannot be executed in this phase and should be clarified as a plan-only action." });
  }

  return warnings;
}