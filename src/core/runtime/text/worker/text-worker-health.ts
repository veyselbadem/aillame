import * as fs from "fs";
import type { AillameTextWorkerConfig, AillameTextWorkerHealth } from "./text-worker-types";
import type { AillameTextWorkerLifecycleState } from "./text-worker-lifecycle";

function modelPathExists(config: AillameTextWorkerConfig): boolean | undefined {
  if (!config.modelPath) return undefined;
  return fs.existsSync(config.modelPath);
}

export function getTextWorkerHealth(
  state: AillameTextWorkerLifecycleState
): AillameTextWorkerHealth {
  const exists = modelPathExists(state.config);
  const warnings: string[] = [];

  if (!state.config.enabled) {
    warnings.push("Aillame-managed text worker is disabled.");
  }

  if (state.config.enabled && !state.config.modelPath) {
    warnings.push("Aillame-managed text worker has no modelPath configured.");
  }

  if (exists === false) {
    warnings.push("Configured text worker modelPath does not exist.");
  }

  if (state.lastError) {
    warnings.push(state.lastError);
  }

  return {
    id: state.config.id,
    status: state.status,
    canGenerate: state.status === "running" && exists !== false,
    reason: warnings[0],
    modelPathExists: exists,
    processManaged: false,
    startedAt: state.startedAt,
    warnings,
  };
}
