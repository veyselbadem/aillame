import * as path from "path";
import { activeGgufModelService } from "../../../../models/download/active-gguf-model-service";

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
  const directPath = process.env.AILLAME_GGUF_MODEL_PATH;

  // Priority: 
  // 1. AILLAME_GGUF_MODEL_PATH
  // 2. AILLAME_GGUF_MODEL_DIR + AILLAME_GGUF_ACTIVE_MODEL
  // 3. active-gguf-model.json (Store)
  let modelPath = directPath ?? (modelDir && activeModel ? path.join(modelDir, activeModel) : undefined);

  if (!modelPath) {
    const storeRecord = activeGgufModelService.getActiveGgufModel();
    if (storeRecord && storeRecord.verified) {
      modelPath = storeRecord.filePath;
    }
  }

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
