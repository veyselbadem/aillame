import { jsonAgentTasksStore } from './store-json';
import type {
  AgentTask,
  AgentTaskStep,
  AgentExecutionLog,
  CreateAgentTaskInput,
  UpdateAgentTaskStatusInput,
  CreateAgentTaskStepInput,
  CreateAgentExecutionLogInput,
} from './types';

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return undefined;
  }

  const forbiddenKeys = ['apiKey', 'secret', 'token', 'password', 'credential', 'credentials', 'auth', 'authorization'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (forbiddenKeys.includes(key.toLowerCase())) {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      const scalarArray = value.filter((item) => ['string', 'number', 'boolean'].includes(typeof item));
      if (scalarArray.length > 0) {
        sanitized[key] = scalarArray;
      }
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const nested: Record<string, unknown> = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (forbiddenKeys.includes(nestedKey.toLowerCase())) {
          continue;
        }
        if (['string', 'number', 'boolean'].includes(typeof nestedValue)) {
          nested[nestedKey] = nestedValue;
        }
      }
      if (Object.keys(nested).length > 0) {
        sanitized[key] = nested;
      }
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export async function createAgentTask(input: CreateAgentTaskInput): Promise<AgentTask> {
  const now = Date.now();
  const task: AgentTask = {
    id: '',
    projectId: input.projectId,
    mode: input.mode,
    taskType: input.taskType,
    title: input.title,
    description: input.description,
    context: sanitizeContext(input.context),
    status: 'pending',
    priority: input.priority ?? 'normal',
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    maxRetries: typeof input.maxRetries === 'number' ? Math.min(10, Math.max(0, input.maxRetries)) : 3,
    result: undefined,
    safetyFlags: input.safetyFlags,
    sourceRequestId: input.sourceRequestId,
  };

  const createdTask = await jsonAgentTasksStore.upsertAgentTask({
    ...input,
    id: undefined,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    retryCount: task.retryCount,
    maxRetries: task.maxRetries,
    priority: task.priority,
    description: task.description,
    context: task.context,
    safetyFlags: task.safetyFlags,
    sourceRequestId: task.sourceRequestId,
  });

  await jsonAgentTasksStore.appendAgentExecutionLog({
    taskId: createdTask.id,
    level: 'info',
    message: 'Agent task created.',
  });

  return createdTask;
}

export function listAgentTasks(filters?: { projectId?: string; mode?: string; status?: AgentTask['status']; taskType?: string }): Promise<AgentTask[]> {
  return jsonAgentTasksStore.listAgentTasks().then((tasks) =>
    tasks.filter((task) => {
      if (filters?.projectId && task.projectId !== filters.projectId) return false;
      if (filters?.mode && task.mode !== filters.mode) return false;
      if (filters?.status && task.status !== filters.status) return false;
      if (filters?.taskType && task.taskType !== filters.taskType) return false;
      return true;
    })
  );
}

export function getAgentTask(taskId: string): Promise<AgentTask | undefined> {
  return jsonAgentTasksStore.getAgentTaskById(taskId);
}

export function updateAgentTaskStatus(taskId: string, input: UpdateAgentTaskStatusInput): Promise<AgentTask | undefined> {
  return jsonAgentTasksStore.updateAgentTaskStatus(taskId, input.status, input.failedReason);
}

export async function createAgentTaskStep(input: CreateAgentTaskStepInput): Promise<AgentTaskStep> {
  return jsonAgentTasksStore.upsertAgentTaskStep({
    ...input,
    id: undefined,
    status: input.status ?? 'queued',
    retryCount: input.retryCount ?? 0,
  });
}

export function listAgentTaskSteps(taskId: string): Promise<AgentTaskStep[]> {
  return jsonAgentTasksStore.listAgentTaskStepsByTaskId(taskId);
}

export function addAgentExecutionLog(input: CreateAgentExecutionLogInput): Promise<AgentExecutionLog> {
  return jsonAgentTasksStore.appendAgentExecutionLog(input);
}

export function listAgentExecutionLogs(taskId: string): Promise<AgentExecutionLog[]> {
  return jsonAgentTasksStore.listAgentExecutionLogsByTaskId(taskId);
}
