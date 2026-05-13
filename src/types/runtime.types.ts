import { AillamePromptMessage } from './prompt.types';

export type AillameRuntimeStatus = "ready" | "missing_model" | "runtime_unavailable" | "error";

export interface AillameRuntimeInput {
  modelId: string;
  prompt: {
    messages: AillamePromptMessage[];
    plainText: string;
  };
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    contextWindow?: number;
  };
}

export interface AillameRuntimeOutput {
  success: true;
  text: string;
  modelId: string;
  runtime: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  meta: {
    durationMs: number;
    mock?: boolean;
  };
}

export interface AillameRuntimeError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  modelId?: string;
  runtime?: string;
}

export type AillameRuntimeResult = AillameRuntimeOutput | AillameRuntimeError;

export interface AillameRuntimeAdapter {
  runtime: string;
  checkAvailability(): Promise<boolean>;
  generate(input: AillameRuntimeInput): Promise<AillameRuntimeResult>;
}
