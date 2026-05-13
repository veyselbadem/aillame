export type WorkspaceAgentExecutionReadinessStatus = 
  | "not_ready" 
  | "blocked" 
  | "ready_for_future_review";

export type WorkspaceAgentExecutionPermissionType = 
  | "future_file_write_permission" 
  | "future_shell_permission" 
  | "future_diff_review" 
  | "future_manual_confirmation";

export type WorkspaceAgentExecutionPreflightCheckType = 
  | "no_execution_available" 
  | "no_file_write_available" 
  | "no_shell_available" 
  | "no_registry_available" 
  | "no_action_executor_available" 
  | "safe_summary_present";

export interface WorkspaceAgentExecutionPermissionRequirement {
  requirementId: string;
  type: WorkspaceAgentExecutionPermissionType;
  required: boolean;
  satisfied: boolean;
  description: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  blocking: boolean;
}

export interface WorkspaceAgentExecutionPreflightCheck {
  checkId: string;
  type: WorkspaceAgentExecutionPreflightCheckType;
  status: "pass" | "warning" | "blocked";
  message: string;
  blocking: boolean;
}

export interface WorkspaceAgentExecutionReadinessWarning {
  code: string;
  message: string;
}

export interface WorkspaceAgentExecutionReadinessRisk {
  code: string;
  level: "low" | "medium" | "high" | "critical";
  message: string;
}

export interface WorkspaceAgentExecutionConfirmation {
  planId: string;
  confirmedAt: string;
  userConfirmationText: string;
  status: "pending" | "confirmed" | "rejected";
}

export interface WorkspaceAgentExecutionReadinessRequest {
  planId: string;
  reviewedStepIds: string[];
  approvedStepIds: string[];
  requestedMode: "readiness_only";
  userVisibleSummary?: string;
  userConfirmationText?: string;
}

export interface WorkspaceAgentExecutionReadinessResult {
  planId: string;
  status: WorkspaceAgentExecutionReadinessStatus;
  preflightChecks: WorkspaceAgentExecutionPreflightCheck[];
  permissions: WorkspaceAgentExecutionPermissionRequirement[];
  warnings: WorkspaceAgentExecutionReadinessWarning[];
  risks: WorkspaceAgentExecutionReadinessRisk[];
  evaluatedAt: string;
  isReadyForFuturePhase: boolean;
}
