import type {
  HeavyModelLockState,
  HeavyModelOwner,
  InternalTextProvider,
} from './model-types';

export class HeavyModelLockError extends Error {
  readonly code: 'LOCK_BUSY' | 'LOCK_OWNER_MISMATCH';

  constructor(message: string, code: HeavyModelLockError['code']) {
    super(message);
    this.name = 'HeavyModelLockError';
    this.code = code;
  }
}

type InferenceAcquireResult = {
  switched: boolean;
  previousOwner?: HeavyModelOwner;
};

let lockState: HeavyModelLockState = {
  phase: 'unlocked',
  updatedAt: Date.now(),
};

function now(): number {
  return Date.now();
}

function setState(next: Partial<HeavyModelLockState>) {
  lockState = {
    ...lockState,
    ...next,
    updatedAt: now(),
  };
}

function isLeaseExpired(): boolean {
  return typeof lockState.leaseUntil === 'number' && lockState.leaseUntil < now();
}

function sameOwner(owner: HeavyModelOwner): boolean {
  return Boolean(
    lockState.owner
    && lockState.owner.modelId === owner.modelId
    && lockState.owner.provider === owner.provider,
  );
}

function forceUnlockIfExpired() {
  if (isLeaseExpired()) {
    lockState = {
      phase: 'unlocked',
      updatedAt: now(),
      lastError: 'Lock lease expired and was forcefully released.',
    };
  }
}

export function getHeavyModelLockState(): HeavyModelLockState {
  forceUnlockIfExpired();
  return { ...lockState, owner: lockState.owner ? { ...lockState.owner } : undefined };
}

export function beginInferenceLock(owner: HeavyModelOwner, leaseMs: number): InferenceAcquireResult {
  forceUnlockIfExpired();
  const leaseUntil = now() + Math.max(5000, leaseMs);

  if (lockState.phase === 'unlocked') {
    setState({ phase: 'loading', owner, leaseUntil, lastError: undefined });
    return { switched: false };
  }

  if (sameOwner(owner)) {
    setState({ phase: 'inferencing', leaseUntil, lastError: undefined });
    return { switched: false };
  }

  if (lockState.phase === 'ready') {
    const previousOwner = lockState.owner;
    setState({ phase: 'unloading', leaseUntil, lastError: undefined });
    setState({ phase: 'loading', owner, leaseUntil, lastError: undefined });
    return { switched: true, previousOwner };
  }

  throw new HeavyModelLockError(
    `Heavy model lock is busy (${lockState.phase}) by ${lockState.owner?.provider ?? 'unknown'}:${lockState.owner?.modelId ?? 'unknown'}.`,
    'LOCK_BUSY',
  );
}

export function markInferenceReady(owner: HeavyModelOwner, leaseMs: number): void {
  if (!sameOwner(owner)) {
    throw new HeavyModelLockError('Cannot mark ready: lock owner mismatch.', 'LOCK_OWNER_MISMATCH');
  }

  setState({
    phase: 'ready',
    leaseUntil: now() + Math.max(5000, leaseMs),
    lastError: undefined,
  });
}

export function markInferenceActive(owner: HeavyModelOwner, leaseMs: number): void {
  if (!sameOwner(owner)) {
    throw new HeavyModelLockError('Cannot mark inferencing: lock owner mismatch.', 'LOCK_OWNER_MISMATCH');
  }

  setState({
    phase: 'inferencing',
    leaseUntil: now() + Math.max(5000, leaseMs),
    lastError: undefined,
  });
}

export function markLockDegraded(owner: HeavyModelOwner, errorMessage: string): void {
  if (!sameOwner(owner)) {
    return;
  }

  setState({
    phase: 'degraded',
    lastError: errorMessage,
    leaseUntil: now() + 15000,
  });
}

export function unlockHeavyModel(owner?: HeavyModelOwner): void {
  if (owner && !sameOwner(owner)) {
    return;
  }

  lockState = {
    phase: 'unlocked',
    updatedAt: now(),
    lastError: undefined,
  };
}

export function getCurrentLockOwnerProvider(): InternalTextProvider | undefined {
  return lockState.owner?.provider;
}
