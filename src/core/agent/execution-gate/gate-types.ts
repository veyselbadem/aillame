export type WorkspaceAgentExecutionGateStatus = 
  | "pending"
  | "checking"
  | "evaluated";

export type WorkspaceAgentExecutionGateDecision = 
  | "blocked"
  | "requires_more_review"
  | "not_supported";

export type WorkspaceAgentExecutionGateCheckType = 
  | "readiness_status_checked"
  | "permission_not_granted"
  | "execution_not_available"
  | "file_write_not_available"
  | "shell_not_available"
  | "registry_not_available"
  | "action_executor_not_available"
  | "safe_summary_checked";

export interface WorkspaceAgentExecutionGateCheck {
  checkId: string;
  type: WorkspaceAgentExecutionGateCheckType;
  status: "pass" | "warning" | "blocked";
  message: string;
  blocking: boolean;
}

export interface WorkspaceAgentExecutionGateWarning {
  code: string;
  message: string;
}

export interface WorkspaceAgentExecutionGateRisk {
  code: string;
  level: "low" | "medium" | "high" | "critical";
  message: string;
}

export interface WorkspaceAgentExecutionGateRequest {
  requestId: string;
  planId: string;
  reviewedStepIds: string[];
  approvedStepIds: string[];
  readinessStatus?: string;
  requestedMode: "gate_check_only";
  userVisibleSummary?: string;
  userConfirmationText?: string;
}

export interface WorkspaceAgentExecutionGateResult {
  requestId: string;
  planId: string;
  status: WorkspaceAgentExecutionGateStatus;
  decision: WorkspaceAgentExecutionGateDecision;
  reasonCode: string;
  safeMessage: string;
  blocking: boolean;
  canExecute: boolean;
  canWrite: boolean;
  canRunShell: boolean;
  issuedCapability: null;
  sanitizedSummary: string;
  sanitizedConfirmation: string;
  checks: WorkspaceAgentExecutionGateCheck[];
  warnings: WorkspaceAgentExecutionGateWarning[];
  risks: WorkspaceAgentExecutionGateRisk[];
  evaluatedAt: string;
}
