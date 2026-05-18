import type { GpuHeavyTask } from './safe-runtime-profile';

export type GpuHeavyLockOwner = GpuHeavyTask;

export interface GpuHeavyLockRecord {
  id: string;
  owner: GpuHeavyLockOwner;
  startedAt: string;
  expiresAt: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  pid?: number;
  requestId?: string;
}

export interface GpuHeavyLockStatus {
  locked: boolean;
  owner: GpuHeavyLockOwner | null;
  lock: GpuHeavyLockRecord | null;
  staleCleared: boolean;
  message: string;
}

export interface GpuHeavyLockAcquireResult {
  acquired: boolean;
  lock: GpuHeavyLockRecord | null;
  status: GpuHeavyLockStatus;
  message: string;
}

export interface GpuHeavyLockAcquireOptions {
  ttlMs?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

const DEFAULT_LOCK_TTL_MS: Record<GpuHeavyLockOwner, number> = {
  'qwen-vlm': 120_000,
  'sdxl-turbo': 180_000,
  'nano-training': 45 * 60_000,
};

const LOCK_STATE_KEY = Symbol.for('aillame.gpuHeavyLock');

type LockState = {
  current: GpuHeavyLockRecord | null;
};

function getLockState(): LockState {
  const globalState = globalThis as typeof globalThis & { [LOCK_STATE_KEY]?: LockState };
  if (!globalState[LOCK_STATE_KEY]) {
    globalState[LOCK_STATE_KEY] = { current: null };
  }
  return globalState[LOCK_STATE_KEY];
}

function isExpired(lock: GpuHeavyLockRecord, now = Date.now()) {
  return new Date(lock.expiresAt).getTime() <= now;
}

function createMessage(lock: GpuHeavyLockRecord | null) {
  if (!lock) return 'Ağır GPU işlemi yok.';
  return `Başka bir ağır GPU işlemi devam ediyor: ${lock.owner}.`;
}

export function clearStaleGpuHeavyLock(now = Date.now()): boolean {
  const state = getLockState();
  if (state.current && isExpired(state.current, now)) {
    state.current = null;
    return true;
  }
  return false;
}

export function getGpuHeavyLock(): GpuHeavyLockRecord | null {
  clearStaleGpuHeavyLock();
  return getLockState().current;
}

export function isGpuHeavyLocked(): boolean {
  return Boolean(getGpuHeavyLock());
}

export function getGpuHeavyLockStatus(): GpuHeavyLockStatus {
  const staleCleared = clearStaleGpuHeavyLock();
  const lock = getLockState().current;
  return {
    locked: Boolean(lock),
    owner: lock?.owner ?? null,
    lock,
    staleCleared,
    message: createMessage(lock),
  };
}

export function acquireGpuHeavyLock(
  owner: GpuHeavyLockOwner,
  options: GpuHeavyLockAcquireOptions = {}
): GpuHeavyLockAcquireResult {
  clearStaleGpuHeavyLock();
  const state = getLockState();
  const existing = state.current;

  if (existing) {
    const status = getGpuHeavyLockStatus();
    return {
      acquired: false,
      lock: existing,
      status,
      message: status.message,
    };
  }

  const now = Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_LOCK_TTL_MS[owner];
  const lock: GpuHeavyLockRecord = {
    id: `${owner}_${now}_${Math.random().toString(36).slice(2, 8)}`,
    owner,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    reason: options.reason,
    metadata: options.metadata,
    pid: typeof process !== 'undefined' ? process.pid : undefined,
    requestId: options.requestId,
  };

  state.current = lock;
  return {
    acquired: true,
    lock,
    status: getGpuHeavyLockStatus(),
    message: `${owner} için ağır GPU lock alındı.`,
  };
}

export function releaseGpuHeavyLock(ownerOrLockId: GpuHeavyLockOwner | string): boolean {
  const state = getLockState();
  const lock = state.current;
  if (!lock) return false;

  if (lock.owner === ownerOrLockId || lock.id === ownerOrLockId) {
    state.current = null;
    return true;
  }

  return false;
}
