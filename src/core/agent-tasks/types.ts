import type { ExternalApiMode } from '@core/external-api/types';

export type AgentTaskStatus =
  | 'pending'
  | 'planning'
  | 'running'
  | 'waiting_for_tool'
  | 'testing'
  | 'reviewing'
  | 'fixing'
  | 'waiting_for_user'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentTaskStepStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped' | 'retrying';

export type AgentExecutionLogLevel = 'debug' | 'info' | 'warning' | 'error';

export type AgentTask = {
  id: string;
  projectId: string;
  mode: ExternalApiMode;
  taskType: string;
  title: string;
  description?: string;
  context?: Record<string, unknown>;
  status: AgentTaskStatus;
  priority: 'low' | 'normal' | 'high';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  failedReason?: string;
  retryCount: number;
  maxRetries: number;
  currentStepId?: string;
  result?: Record<string, unknown>;
  safetyFlags?: Record<string, unknown>;
  sourceRequestId?: string;
};

export type AgentTaskStep = {
  id: string;
  taskId: string;
  order: number;
  type: string;
  title: string;
  inputSummary?: string;
  outputSummary?: string;
  status: AgentTaskStepStatus;
  toolName?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
};

export type AgentExecutionLog = {
  id: string;
  taskId: string;
  stepId?: string;
  level: AgentExecutionLogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

export type CreateAgentTaskInput = {
  projectId: string;
  mode: ExternalApiMode;
  taskType: string;
  title: string;
  description?: string;
  context?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
  maxRetries?: number;
  safetyFlags?: Record<string, unknown>;
  sourceRequestId?: string;
};

export type UpdateAgentTaskStatusInput = {
  status: AgentTaskStatus;
  failedReason?: string;
};

export type CreateAgentTaskStepInput = {
  taskId: string;
  order: number;
  type: string;
  title: string;
  inputSummary?: string;
  outputSummary?: string;
  status?: AgentTaskStepStatus;
  toolName?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  retryCount?: number;
};

export type CreateAgentExecutionLogInput = {
  taskId: string;
  stepId?: string;
  level: AgentExecutionLogLevel;
  message: string;
  metadata?: Record<string, unknown>;
};
