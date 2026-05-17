export type WorkflowStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface WorkflowContext {
  workflowId: string;
  workflowName: string;
  project?: string;
  startedAt: string;
  metadata?: Record<string, unknown>;
  abortSignal?: AbortSignal;
  permissionMode?: "read_only" | "suggest_edits" | "user_approved_write" | "sandbox_full_agent";
}

export interface StepResult {
  stepId: string;
  name: string;
  status: StepStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  output?: any;
  error?: WorkflowError;
}

export interface WorkflowResult {
  workflowId: string;
  workflowName: string;
  status: WorkflowStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: StepResult[];
  output?: any;
  error?: WorkflowError;
}

export interface WorkflowError {
  code: string;
  message: string;
  details?: any;
}

export interface WorkflowStep {
  id: string;
  name: string;
  run(input: any, context: WorkflowContext): Promise<StepResult>;
}
