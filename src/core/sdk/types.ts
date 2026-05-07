import type { AillameProjectMode, AillameResponseFormat } from "@core/projects/project-identity";

export type AillameClientOptions = {
  baseUrl: string;
  apiKey?: string;
  projectId: string;
  mode?: AillameProjectMode;
  sourceApp?: string;
};

export type AillameChatRequest = {
  message: string;
  projectId?: string;
  mode?: AillameProjectMode;
  taskType?: string;
  sessionId?: string;
  userId?: string;
  responseFormat?: AillameResponseFormat;
  writeMemory?: boolean;
  includeGlobalMemory?: boolean;
  maxTokens?: number;
  temperature?: number;
};

export type AillameChatResponse = {
  success: boolean;
  requestId: string;
  projectId?: string;
  mode?: string;
  data?: {
    content?: string;
    message?: string;
    warnings?: string[];
    memory?: {
      recalled: number;
      written: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  diagnostics?: Record<string, unknown>;
};

export type AillameTaskRequest = Omit<AillameChatRequest, "message"> & {
  taskType: string;
  message?: string;
  payload?: Record<string, unknown>;
};

export type AillameStatusResponse = {
  success: boolean;
  requestId: string;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export type AillameMemoryWriteRequest = {
  content: string;
  topic?: string;
  tags?: string[];
  sessionId?: string;
};

export class AillameSdkError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AillameSdkError";
    this.status = status;
    this.code = code;
  }
}
