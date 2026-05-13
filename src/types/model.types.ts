import { AillameMode } from './project.types';

export type AillameModelProvider = "aillame-local";

export type AillameModelRuntime = "aillame-gguf" | "aillame-onnx" | "aillame-custom";

export type AillameModelType = "text-generation" | "code-generation" | "image-prompt";

export type AillameModelStatus = "available" | "missing" | "disabled";

export interface AillameLocalModelConfig {
  id: string;
  name: string;
  description?: string;
  provider: AillameModelProvider;
  runtime: AillameModelRuntime;
  type: AillameModelType;
  path: string;
  defaultForModes: AillameMode[];
  supportedTaskTypes: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  temperature?: number;
  isActive: boolean;
  createdAt: string;
}

export interface AillameModelRegistryItem {
  id: string;
  name: string;
  provider: AillameModelProvider;
  runtime: AillameModelRuntime;
  type: AillameModelType;
  status: AillameModelStatus;
  path: string;
  exists: boolean;
  defaultForModes: AillameMode[];
  supportedTaskTypes: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AillameModelSelectionInput {
  mode: AillameMode;
  taskType?: string;
}

export interface AillameModelSelectionResult {
  model: AillameModelRegistryItem;
  reason: string;
}
