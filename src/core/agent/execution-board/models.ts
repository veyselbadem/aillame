export type AgentRunRiskLevel = "low" | "medium" | "high" | "critical";

export type AgentRunStatus = 
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "approval-required"
  | "skipped";

export type AgentRunApprovalState = "pending-approval" | "approved" | "rejected" | "not-required";

export type AgentRunType = 
  | "code-agent"
  | "provider-task"
  | "memory-task"
  | "image-job"
  | "ingestion-task"
  | "nano-diagnostic"
  | "unknown";

export interface AgentRunDiagnostics {
  error?: string;
  blockedReason?: string;
  safetySummary?: string;
  executionTimeMs?: number;
  [key: string]: any;
}

export interface AgentRunLogEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  technicalDetails?: string;
}

export interface AgentRunStep {
  id: string;
  name: string;
  status: AgentRunStatus;
  startedAt?: number;
  completedAt?: number;
  logs: AgentRunLogEntry[];
  diagnostics?: AgentRunDiagnostics;
}

export interface AgentRun {
  id: string;
  projectId: string;
  taskType: AgentRunType;
  status: AgentRunStatus;
  riskLevel: AgentRunRiskLevel;
  approvalRequired: boolean;
  approvalState: AgentRunApprovalState;
  currentStepId?: string;
  steps: AgentRunStep[];
  diagnostics: AgentRunDiagnostics;
  createdAt: number;
  updatedAt: number;
}
