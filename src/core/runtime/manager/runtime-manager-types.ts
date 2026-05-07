export type AillameRuntimeDomain =
  | "text"
  | "image"
  | "vision"
  | "agent"
  | "unknown";

export type AillameRuntimeLifecycleState =
  | "available"
  | "disabled"
  | "unavailable"
  | "degraded"
  | "not-configured"
  | "not-implemented"
  | "unknown";

export type AillameRuntimeLifecycleAction =
  | "inspect"
  | "health-check"
  | "start"
  | "stop"
  | "restart"
  | "warmup"
  | "reload-model";

export type AillameRuntimeLifecycleActionRisk =
  | "safe"
  | "review-required"
  | "blocked";

export type AillameRuntimeLifecycleEntry = {
  id: string;
  label?: string;
  domain: AillameRuntimeDomain;
  runtimeType: string;
  healthKind?: string;
  modelId?: string;
  state: AillameRuntimeLifecycleState;
  canGenerate: boolean;
  canStart: boolean;
  canStop: boolean;
  supportsStreaming: boolean;
  capabilities: string[];
  reason?: string;
  warnings: string[];
};

export type AillameRuntimeManagerSummary = {
  success: boolean;
  total: number;
  available: number;
  disabled: number;
  unavailable: number;
  degraded: number;
  entries: AillameRuntimeLifecycleEntry[];
  warnings: string[];
};

export type AillameRuntimeActionPlanInput = {
  runtimeId: string;
  action: AillameRuntimeLifecycleAction;
  dryRun?: boolean;
};

export type AillameRuntimeActionPlanResult = {
  success: boolean;
  mode: "dry-run";
  runtimeId: string;
  action: AillameRuntimeLifecycleAction;
  allowed: boolean;
  risk: AillameRuntimeLifecycleActionRisk;
  reason: string;
  steps: string[];
  blockedReasons: string[];
  safetyNotes: string[];
};
