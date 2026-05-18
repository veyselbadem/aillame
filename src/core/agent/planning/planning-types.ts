export type WorkspaceAgentPlanMode = "plan_only";

export type WorkspaceAgentPlanStatus = "draft" | "ready" | "needs_user_input" | "blocked";

export type WorkspaceAgentPlanScope = {
  label: string;
  description: string;
  allowedCategories: Array<"inspect" | "edit_proposal" | "test_proposal" | "manual_review" | "ask_user">;
  requiresExplicitPermission: boolean;
};

export type WorkspaceAgentPlanWarning = {
  code:
    | "LONG_GOAL"
    | "COMMAND_LIKE_INPUT"
    | "FILE_WRITE_INTENT"
    | "SECRET_PATTERN"
    | "PATH_PATTERN"
    | "EXPLICIT_PERMISSION_REQUIRED"
    | "NEEDS_CLARIFICATION";
  message: string;
};

export type WorkspaceAgentPlanRisk = {
  code:
    | "no_execution_boundary"
    | "write_requires_future_permission"
    | "test_requires_future_permission"
    | "scope_unclear"
    | "sensitive_data_masked";
  level: "low" | "medium" | "high";
  message: string;
};

export type WorkspaceAgentPlanStepType = "inspect" | "edit_proposal" | "test_proposal" | "manual_review" | "ask_user";

export type WorkspaceAgentPlanStep = {
  stepId: string;
  title: string;
  description: string;
  type: WorkspaceAgentPlanStepType;
  riskLevel: "low" | "medium" | "high";
  requiresPermission: boolean;
  executable: false;
  warnings?: WorkspaceAgentPlanWarning[];
};

export type WorkspaceAgentPlanRequest = {
  mode: WorkspaceAgentPlanMode;
  userGoal: string;
  visibleContextSummary?: string;
  allowedScope?: WorkspaceAgentPlanScope;
  maxSteps?: number;
};

export type WorkspaceAgentPlan = {
  mode: WorkspaceAgentPlanMode;
  status: WorkspaceAgentPlanStatus;
  summary: string;
  request: {
    mode: WorkspaceAgentPlanMode;
    userGoal: string;
    visibleContextSummary?: string;
    allowedScope?: WorkspaceAgentPlanScope;
    maxSteps?: number;
  };
  steps: WorkspaceAgentPlanStep[];
  warnings: WorkspaceAgentPlanWarning[];
  risks: WorkspaceAgentPlanRisk[];
  notes: string[];
};