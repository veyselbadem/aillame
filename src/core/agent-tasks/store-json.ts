import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { resolveProjectRelative } from '../project-root';
import type {
  AgentTask,
  AgentTaskStep,
  AgentExecutionLog,
  CreateAgentTaskInput,
  CreateAgentTaskStepInput,
  CreateAgentExecutionLogInput,
} from './types';

const AGENT_TASKS_STORE_PATH = resolveProjectRelative('.aillame-data/stores/agent-tasks-store.json');
const AGENT_TASK_STEPS_STORE_PATH = resolveProjectRelative('.aillame-data/stores/agent-task-steps-store.json');
const AGENT_EXECUTION_LOG_STORE_PATH = resolveProjectRelative('.aillame-data/stores/agent-execution-log-store.json');

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const normalized = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalized) as T[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, records: T[]): Promise<void> {
  await writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonAgentTasksStore = {
  async readAgentTasks(): Promise<AgentTask[]> {
    return readJsonFile<AgentTask>(AGENT_TASKS_STORE_PATH);
  },

  async writeAgentTasks(tasks: AgentTask[]): Promise<void> {
    await writeJsonFile<AgentTask>(AGENT_TASKS_STORE_PATH, tasks);
  },

  async upsertAgentTask(input: CreateAgentTaskInput & { id?: string; status: AgentTask['status']; createdAt: number; updatedAt: number; retryCount: number; maxRetries: number; priority: AgentTask['priority']; completedAt?: number; failedReason?: string; currentStepId?: string; result?: Record<string, unknown>; safetyFlags?: Record<string, unknown>; sourceRequestId?: string; }): Promise<AgentTask> {
    const tasks = await this.readAgentTasks();
    const taskId = input.id ?? generateId();
    const existingIndex = tasks.findIndex((task) => task.id === taskId);
    const task: AgentTask = {
      id: taskId,
      projectId: input.projectId,
      mode: input.mode,
      taskType: input.taskType,
      title: input.title,
      description: input.description,
      context: input.context,
      status: input.status,
      priority: input.priority,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      completedAt: input.completedAt,
      failedReason: input.failedReason,
      retryCount: input.retryCount,
      maxRetries: input.maxRetries,
      currentStepId: input.currentStepId,
      result: input.result,
      safetyFlags: input.safetyFlags,
      sourceRequestId: input.sourceRequestId,
    };

    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }

    await this.writeAgentTasks(tasks);
    return task;
  },

  async listAgentTasks(): Promise<AgentTask[]> {
    return this.readAgentTasks();
  },

  async getAgentTaskById(taskId: string): Promise<AgentTask | undefined> {
    const tasks = await this.readAgentTasks();
    return tasks.find((task) => task.id === taskId);
  },

  async updateAgentTaskStatus(taskId: string, status: AgentTask['status'], failedReason?: string): Promise<AgentTask | undefined> {
    const tasks = await this.readAgentTasks();
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) {
      return undefined;
    }

    const now = Date.now();
    const updated: AgentTask = {
      ...tasks[index],
      status,
      failedReason: status === 'failed' ? failedReason : tasks[index].failedReason,
      completedAt: status === 'completed' ? now : tasks[index].completedAt,
      updatedAt: now,
    };

    tasks[index] = updated;
    await this.writeAgentTasks(tasks);
    return updated;
  },

  async readAgentTaskSteps(): Promise<AgentTaskStep[]> {
    return readJsonFile<AgentTaskStep>(AGENT_TASK_STEPS_STORE_PATH);
  },

  async writeAgentTaskSteps(steps: AgentTaskStep[]): Promise<void> {
    await writeJsonFile<AgentTaskStep>(AGENT_TASK_STEPS_STORE_PATH, steps);
  },

  async listAgentTaskStepsByTaskId(taskId: string): Promise<AgentTaskStep[]> {
    const steps = await this.readAgentTaskSteps();
    return steps.filter((step) => step.taskId === taskId).sort((a, b) => a.order - b.order);
  },

  async upsertAgentTaskStep(input: CreateAgentTaskStepInput & { id?: string }): Promise<AgentTaskStep> {
    const steps = await this.readAgentTaskSteps();
    const stepId = input.id ?? generateId();
    const existingIndex = steps.findIndex((step) => step.id === stepId);
    const step: AgentTaskStep = {
      id: stepId,
      taskId: input.taskId,
      order: input.order,
      type: input.type,
      title: input.title,
      inputSummary: input.inputSummary,
      outputSummary: input.outputSummary,
      status: input.status ?? 'queued',
      toolName: input.toolName,
      error: input.error,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      retryCount: input.retryCount ?? 0,
    };

    if (existingIndex >= 0) {
      steps[existingIndex] = step;
    } else {
      steps.push(step);
    }

    await this.writeAgentTaskSteps(steps);
    return step;
  },

  async readAgentExecutionLogs(): Promise<AgentExecutionLog[]> {
    return readJsonFile<AgentExecutionLog>(AGENT_EXECUTION_LOG_STORE_PATH);
  },

  async writeAgentExecutionLogs(logs: AgentExecutionLog[]): Promise<void> {
    await writeJsonFile<AgentExecutionLog>(AGENT_EXECUTION_LOG_STORE_PATH, logs);
  },

  async appendAgentExecutionLog(input: CreateAgentExecutionLogInput): Promise<AgentExecutionLog> {
    const logs = await this.readAgentExecutionLogs();
    const log: AgentExecutionLog = {
      id: generateId(),
      taskId: input.taskId,
      stepId: input.stepId,
      level: input.level,
      message: input.message,
      metadata: input.metadata,
      createdAt: Date.now(),
    };
    logs.push(log);
    await this.writeAgentExecutionLogs(logs);
    return log;
  },

  async listAgentExecutionLogsByTaskId(taskId: string): Promise<AgentExecutionLog[]> {
    const logs = await this.readAgentExecutionLogs();
    return logs.filter((log) => log.taskId === taskId).sort((a, b) => a.createdAt - b.createdAt);
  },
};
