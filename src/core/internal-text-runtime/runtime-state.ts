import type {
  HeavyModelOwner,
  InternalTextRuntimeStatus,
  InternalTextProvider,
  RuntimeHealthState,
} from './model-types';
import { getHeavyModelLockState, unlockHeavyModel } from './lock-manager';

let internalRuntimeState: Omit<InternalTextRuntimeStatus, 'lock'> = {
  enabled: true,
  health: 'healthy',
};

function now(): number {
  return Date.now();
}

export function setRuntimeEnabled(enabled: boolean): void {
  internalRuntimeState = {
    ...internalRuntimeState,
    enabled,
    health: enabled ? internalRuntimeState.health : 'disabled',
  };
}

export function setRuntimeHealth(health: RuntimeHealthState, errorMessage?: string): void {
  internalRuntimeState = {
    ...internalRuntimeState,
    health,
    lastError: errorMessage ?? internalRuntimeState.lastError,
  };
}

export function setActiveModel(owner: HeavyModelOwner | undefined): void {
  internalRuntimeState = {
    ...internalRuntimeState,
    activeModelId: owner?.modelId,
    activeProvider: owner?.provider,
  };
}

export function markRuntimeRequestStart(provider: InternalTextProvider, modelId: string): void {
  internalRuntimeState = {
    ...internalRuntimeState,
    lastRequestAt: now(),
    activeProvider: provider,
    activeModelId: modelId,
  };
}

export function markRuntimeRequestSuccess(latencyMs: number): void {
  internalRuntimeState = {
    ...internalRuntimeState,
    health: 'healthy',
    lastLatencyMs: latencyMs,
    lastError: undefined,
    lastRequestAt: now(),
  };
}

export function markRuntimeRequestError(errorMessage: string): void {
  internalRuntimeState = {
    ...internalRuntimeState,
    health: 'degraded',
    lastError: errorMessage,
    lastRequestAt: now(),
  };
}

export function maybeUnloadByIdlePolicy(unloadIdleMs: number): { unloaded: boolean; reason?: string } {
  const lock = getHeavyModelLockState();
  const lastRequestAt = internalRuntimeState.lastRequestAt;

  if (!lastRequestAt || lock.phase === 'unlocked') {
    return { unloaded: false };
  }

  if (Date.now() - lastRequestAt < unloadIdleMs) {
    return { unloaded: false };
  }

  unlockHeavyModel();
  setActiveModel(undefined);
  setRuntimeHealth('healthy');

  return {
    unloaded: true,
    reason: `Idle unload policy triggered after ${unloadIdleMs}ms.`,
  };
}

export function getInternalTextRuntimeStatus(): InternalTextRuntimeStatus {
  return {
    ...internalRuntimeState,
    lock: getHeavyModelLockState(),
  };
}
