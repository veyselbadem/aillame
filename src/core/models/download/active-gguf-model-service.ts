import fs from "fs";
import path from "path";
import { resolveStoragePath, ensureStorageRoot } from "../../storage/file-store";
import { verifyLocalGgufModel, type VerifiedGgufModel } from "./model-verification-service";

import { getGgufModelDirectory } from "../model-path-policy";

export interface ActiveGgufModelRecord {
  modelId: string;
  fileName: string;
  filePath: string;
  selectedAt: number;
  source: "env" | "store";
  verified: boolean;
}

const ACTIVE_MODEL_FILE = "active-gguf-model.json";

function configuredEnvActiveModel(): ActiveGgufModelRecord | undefined {
  const modelDir = getGgufModelDirectory();
  const activeModel = process.env.AILLAME_GGUF_ACTIVE_MODEL;
  const directPath = process.env.AILLAME_GGUF_MODEL_PATH;
  const filePath = directPath || (process.env.AILLAME_GGUF_ACTIVE_MODEL && modelDir ? path.join(modelDir, activeModel!) : undefined);
  if (!filePath) return undefined;
  const verified = verifyLocalGgufModel(filePath);
  return {
    modelId: activeModel || path.basename(filePath),
    fileName: path.basename(filePath),
    filePath,
    selectedAt: Date.now(),
    source: "env",
    verified: verified.verified,
  };
}

export class ActiveGgufModelService {
  listInstalledGgufModels(modelDir = getGgufModelDirectory()): VerifiedGgufModel[] {
    if (!modelDir || !fs.existsSync(modelDir)) return [];
    return fs.readdirSync(modelDir)
      .filter((fileName) => fileName.toLowerCase().endsWith(".gguf"))
      .map((fileName) => verifyLocalGgufModel(path.join(modelDir, fileName)));
  }

  getActiveGgufModel(): ActiveGgufModelRecord | undefined {
    const envRecord = configuredEnvActiveModel();
    if (envRecord) return envRecord;

    const filePath = resolveStoragePath(ACTIVE_MODEL_FILE);
    if (!fs.existsSync(filePath)) return undefined;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as ActiveGgufModelRecord;
    } catch {
      return undefined;
    }
  }

  selectActiveGgufModel(input: { modelId: string; filePath: string; approved?: boolean }): ActiveGgufModelRecord {
    if (!input.approved) {
      throw new Error("Selecting active GGUF model requires explicit approval.");
    }
    const verification = verifyLocalGgufModel(input.filePath);
    if (!verification.verified) {
      throw new Error(`Model is not verified: ${verification.errors.join(", ")}`);
    }
    ensureStorageRoot();
    const record: ActiveGgufModelRecord = {
      modelId: input.modelId,
      fileName: verification.fileName,
      filePath: verification.filePath,
      selectedAt: Date.now(),
      source: "store",
      verified: true,
    };
    fs.writeFileSync(resolveStoragePath(ACTIVE_MODEL_FILE), JSON.stringify(record, null, 2), "utf8");
    return record;
  }
}

export const activeGgufModelService = new ActiveGgufModelService();
