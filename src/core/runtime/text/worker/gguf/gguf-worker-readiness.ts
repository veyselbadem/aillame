import * as fs from "fs";
import { getGgufWorkerConfig } from "./gguf-worker-config";
import { validateGgufModelPath } from "./gguf-worker-path-policy";
import type { AillameGgufWorkerReadinessResult, AillameGgufModelManifest } from "./gguf-worker-types";

export function checkGgufWorkerReadiness(): AillameGgufWorkerReadinessResult {
  const config = getGgufWorkerConfig();
  const warnings: string[] = [];
  const blockedReasons: string[] = [];

  const pathValidation = validateGgufModelPath(config.modelPath);
  
  let modelPathExists = false;
  if (pathValidation.allowed && pathValidation.normalizedPath) {
    try {
      modelPathExists = fs.existsSync(pathValidation.normalizedPath);
    } catch {
      modelPathExists = false;
    }
  }

  const manifest: AillameGgufModelManifest = {
    id: "gguf-prototype",
    label: "Local GGUF Prototype",
    modelPath: config.modelPath,
    modelFormat: "gguf",
    capabilities: ["chat", "text-generation"],
    supportsStreaming: false, // Not implemented in prototype phase
    notes: ["Experimental GGUF worker prototype"],
  };

  let state: AillameGgufWorkerReadinessResult["state"] = "ready-for-manual-enable";
  let canEnable = false;

  if (!config.modelPath) {
    state = "model-path-missing";
    blockedReasons.push("AILLAME_GGUF_MODEL_PATH environment variable is not set.");
  } else if (!pathValidation.allowed) {
    state = "model-path-invalid";
    blockedReasons.push(pathValidation.reason || "Invalid model path.");
  } else if (!modelPathExists) {
    state = "model-file-missing";
    blockedReasons.push(`GGUF model file not found at: ${config.modelPath}`);
  }

  if (state === "ready-for-manual-enable") {
    if (!config.enabled) {
      warnings.push("GGUF worker is configured but currently disabled (AILLAME_GGUF_WORKER_ENABLED=false).");
    } else {
      canEnable = true;
    }
  }

  return {
    success: true,
    state,
    manifest,
    modelPathExists,
    allowedByPathPolicy: pathValidation.allowed,
    canEnable,
    canGenerate: false, // Always false in this planning phase
    warnings,
    blockedReasons,
  };
}
