import * as path from "path";

export type AillameGgufWorkerConfig = {
  enabled: boolean;
  runtimeBinary?: string;
  modelPath?: string;
  modelDir?: string;
  activeModel?: string;
  autoEnable: boolean;
  allowExternalModels: boolean;
  maxMemoryGb: number;
};

export function getGgufWorkerConfig(): AillameGgufWorkerConfig {
  const enabled = process.env.AILLAME_GGUF_RUNTIME_ENABLED === "true"
    || process.env.AILLAME_GGUF_WORKER_ENABLED === "true";
  const runtimeBinary = process.env.AILLAME_GGUF_RUNTIME_BINARY;
  const modelDir = process.env.AILLAME_GGUF_MODEL_DIR;
  const activeModel = process.env.AILLAME_GGUF_ACTIVE_MODEL;
  const modelPath = process.env.AILLAME_GGUF_MODEL_PATH
    ?? (modelDir && activeModel ? path.join(modelDir, activeModel) : undefined);
  const autoEnable = process.env.AILLAME_GGUF_AUTO_ENABLE === "true";
  const allowExternalModels = process.env.AILLAME_GGUF_ALLOW_EXTERNAL === "true";
  const maxMemoryGb = parseInt(process.env.AILLAME_GGUF_MAX_MEMORY_GB || "8", 10);

  return {
    enabled,
    runtimeBinary,
    modelPath,
    modelDir,
    activeModel,
    autoEnable,
    allowExternalModels,
    maxMemoryGb,
  };
}

export function getDefaultModelDir(): string {
  // Safe default: models directory in project root
  return path.join(process.cwd(), "models", "gguf");
}
