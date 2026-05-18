import type { AillameProjectIdentity } from "@core/projects/project-identity";

export type ExternalProviderSuccess<TData = unknown> = {
  success: true;
  requestId: string;
  projectId: string;
  mode?: string;
  data: TData;
  diagnostics: Record<string, unknown>;
};

export type ExternalProviderError = {
  success: false;
  requestId: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type ExternalChatData = {
  message: string;
  content: string;
  structured?: any;
  meta?: Record<string, any>;
  runtime: string;
  usedLocalRuntime: boolean;
  degraded: boolean;
  warnings: string[];
  memory?: {
    recalled: number;
    written: boolean;
  };
};

export type ExternalTaskData = {
  accepted: boolean;
  identity: AillameProjectIdentity;
  route: {
    taskType?: string;
    requiredCapabilities?: string[];
  };
};
