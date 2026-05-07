export type AillameTextWorkerStatus =
  | "not-configured"
  | "stopped"
  | "starting"
  | "running"
  | "degraded"
  | "failed"
  | "disabled";

export type AillameTextWorkerKind =
  | "local-process"
  | "native-worker"
  | "python-worker"
  | "placeholder";

export type AillameTextWorkerModelFormat =
  | "gguf"
  | "safetensors"
  | "onnx"
  | "unknown";

export type AillameTextWorkerConfig = {
  id: string;
  label: string;
  enabled: boolean;
  kind: AillameTextWorkerKind;
  modelId: string;
  modelPath?: string;
  modelFormat: AillameTextWorkerModelFormat;
  command?: string;
  args?: string[];
  workingDirectory?: string;
  env?: Record<string, string>;
  port?: number;
  healthUrl?: string;
  supportsStreaming: boolean;
  capabilities: string[];
  notes?: string[];
};

export type AillameTextWorkerHealth = {
  id: string;
  status: AillameTextWorkerStatus;
  canGenerate: boolean;
  reason?: string;
  modelPathExists?: boolean;
  processManaged: boolean;
  startedAt?: string;
  warnings: string[];
};

export type AillameTextWorkerGenerateRequest = {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  messages?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
};

export type AillameTextWorkerGenerateResult = {
  success: boolean;
  content: string;
  finishReason: "stop" | "length" | "error" | "unsupported" | "unknown";
  degraded: boolean;
  warnings: string[];
  error?: {
    code: string;
    message: string;
  };
};
