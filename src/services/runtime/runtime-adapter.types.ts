export type RuntimeModelType = "text" | "image" | "code" | "vision";

export interface RuntimeModelRef {
  id: string;
  type: RuntimeModelType;
  path: string;
  name?: string;
  format: "gguf" | string;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  systemPrompt?: string;
  messages?: any[];
}

export interface GenerateResult {
  ok: boolean;
  text: string;
  modelId: string;
  modelPath: string;
  durationMs: number;
  tokenCount?: number | "not_available";
  finishReason?: string;
}

export interface RuntimeLoadResult {
  ok: boolean;
  modelId: string;
  modelPath: string;
  durationMs: number;
  status: "ready" | "failed";
  error?: RuntimeError;
}

export interface RuntimeError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ModelInfo {
  id: string;
  type: RuntimeModelType;
  path: string;
  status: "ready" | "loading" | "failed" | "not_loaded";
}

export interface RuntimeAdapter {
  isReady(): boolean;
  load(model: RuntimeModelRef): Promise<RuntimeLoadResult>;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  getModelInfo(): ModelInfo | null;
  unload(): Promise<void>;
}
