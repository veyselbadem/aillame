import type { AillameMode } from "@core/aillame-router/types";
import type { ModelCapability as AillameModelCapability } from "@core/models/registry";

export type AillameTaskType =
  | "chat"
  | "text"
  | "code"
  | "analysis"
  | "image"
  | "vision"
  | "agent"
  | "mixed"
  | "unknown";

export type AillameContentType =
  | "text"
  | "image"
  | "code"
  | "project"
  | "mixed";

export type AillameOutputType =
  | "text"
  | "image"
  | "json"
  | "patch"
  | "report"
  | "mixed";

export type AillameMessageRole = "system" | "user" | "assistant" | "tool";

export type AillameMessage = {
  role: AillameMessageRole;
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
};

export type AillameRequest = {
  prompt: string;
  messages?: AillameMessage[];
  projectId?: string;
  mode?: AillameMode;
  taskType?: AillameTaskType;
  contentType?: AillameContentType;
  outputType?: AillameOutputType;
  preferredModelId?: string;
  metadata?: Record<string, unknown>;
};

export type AillameRoutingDecision = {
  taskType: AillameTaskType;
  contentType: AillameContentType;
  outputType: AillameOutputType;
  selectedModelId?: string;
  capabilities: AillameModelCapability[];
  confidence: number;
  reason: string;
  warnings?: string[];
};
