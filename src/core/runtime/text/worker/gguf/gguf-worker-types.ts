export type AillameGgufWorkerReadinessState =
  | "not-configured"
  | "model-path-missing"
  | "model-path-invalid"
  | "model-file-missing"
  | "ready-for-manual-enable"
  | "blocked";

export type AillameGgufModelManifest = {
  id: string;
  label: string;
  modelPath?: string;
  modelFormat: "gguf";
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities: string[];
  supportsStreaming: boolean;
  notes: string[];
};

export type AillameGgufWorkerReadinessResult = {
  success: boolean;
  state: AillameGgufWorkerReadinessState;
  manifest: AillameGgufModelManifest;
  modelPathExists: boolean;
  allowedByPathPolicy: boolean;
  canEnable: boolean;
  canGenerate: false;
  warnings: string[];
  blockedReasons: string[];
};
