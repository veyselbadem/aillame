export type AillameTextRuntimeKind =
  | "nano-rust"
  | "aillame-managed-worker"
  | "llama-server-gguf"
  | "native-local"
  | "placeholder";

export type AillameTextRuntimeStatus =
  | "available"
  | "unavailable"
  | "disabled"
  | "degraded"
  | "unknown";

export type AillameTextRuntimeCapability =
  | "chat"
  | "completion"
  | "text-generation"
  | "code-generation"
  | "analysis"
  | "decision"
  | "summarization"
  | "streaming";

export type AillameTextRuntimeModelInfo = {
  id: string;
  label: string;
  runtimeKind: AillameTextRuntimeKind;
  status: AillameTextRuntimeStatus;
  capabilities: AillameTextRuntimeCapability[];
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsStreaming: boolean;
  supportsSystemPrompt: boolean;
  supportsTools?: boolean;
  notes?: string[];
};

export type AillameTextMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type AillameTextGenerateRequest = {
  modelId?: string;
  projectId?: string;
  mode?: string;
  taskType?: string;
  prompt?: string;
  messages?: AillameTextMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  metadata?: Record<string, unknown>;
};

export type AillameTextGenerateResult = {
  success: boolean;
  modelId: string;
  runtimeKind: AillameTextRuntimeKind;
  content: string;
  finishReason:
    | "stop"
    | "length"
    | "error"
    | "unsupported"
    | "degraded"
    | "unknown";
  usedLocalRuntime: boolean;
  degraded: boolean;
  warnings: string[];
  diagnostics?: {
    reasonCode?: string;
    rawPreview?: string;
    tokenCount?: number;
    runtimeStatus?: AillameTextRuntimeStatus;
  };
  error?: {
    code: string;
    message: string;
  };
};
