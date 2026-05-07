import * as path from "path";

export type AillameGgufWorkerConfig = {
  enabled: boolean;
  modelPath?: string;
  autoEnable: boolean;
  allowExternalModels: boolean;
  maxMemoryGb: number;
};

export function getGgufWorkerConfig(): AillameGgufWorkerConfig {
  const enabled = process.env.AILLAME_GGUF_WORKER_ENABLED === "true";
  const modelPath = process.env.AILLAME_GGUF_MODEL_PATH;
  const autoEnable = process.env.AILLAME_GGUF_AUTO_ENABLE === "true";
  const allowExternalModels = process.env.AILLAME_GGUF_ALLOW_EXTERNAL === "true";
  const maxMemoryGb = parseInt(process.env.AILLAME_GGUF_MAX_MEMORY_GB || "8", 10);

  return {
    enabled,
    modelPath,
    autoEnable,
    allowExternalModels,
    maxMemoryGb,
  };
}

export function getDefaultModelDir(): string {
  // Safe default: models directory in project root
  return path.join(process.cwd(), "models", "gguf");
}
