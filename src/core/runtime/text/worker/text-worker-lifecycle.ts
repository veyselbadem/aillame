import type { AillameTextWorkerConfig, AillameTextWorkerHealth } from "./text-worker-types";

export type AillameTextWorkerLifecycleState = {
  config: AillameTextWorkerConfig;
  status: AillameTextWorkerHealth["status"];
  startedAt?: string;
  lastError?: string;
};

export function createTextWorkerLifecycleState(
  config: AillameTextWorkerConfig
): AillameTextWorkerLifecycleState {
  return {
    config,
    status: config.enabled ? "stopped" : "disabled",
  };
}

export function startTextWorkerPlaceholder(
  state: AillameTextWorkerLifecycleState
): AillameTextWorkerLifecycleState {
  if (!state.config.enabled) {
    return {
      ...state,
      status: "disabled",
      lastError: "TEXT_WORKER_DISABLED",
    };
  }

  return {
    ...state,
    status: "failed",
    lastError: "TEXT_WORKER_PROCESS_START_NOT_IMPLEMENTED",
  };
}

export function stopTextWorkerPlaceholder(
  state: AillameTextWorkerLifecycleState
): AillameTextWorkerLifecycleState {
  return {
    ...state,
    status: state.config.enabled ? "stopped" : "disabled",
  };
}
