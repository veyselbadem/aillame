import fs from 'fs';
import path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────

export type RuntimeModelEventType =
  | 'model_selection'
  | 'fallback'
  | 'preflight'
  | 'runtime_error';

export interface RuntimeModelEvent {
  id: string;
  type: RuntimeModelEventType;
  provider?: string;
  requestedModelId?: string;
  selectedModelId?: string;
  fallbackModelId?: string;
  capability?: string;
  ok: boolean;
  reason?: string;
  source?: string;
  createdAt: string;
}

// ── Store path ────────────────────────────────────────────────────────────

const EVENT_LOG_FILE = path.join(
  process.cwd(),
  'data',
  'ai-lab',
  'runtime-events.json',
);

const MAX_EVENTS = 100;

// ── Helpers ───────────────────────────────────────────────────────────────

function ensureEventLogDir(): void {
  const dir = path.dirname(EVENT_LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateEventId(): string {
  return `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Read ──────────────────────────────────────────────────────────────────

export function listRuntimeModelEvents(limit?: number): RuntimeModelEvent[] {
  try {
    if (!fs.existsSync(EVENT_LOG_FILE)) return [];
    const raw = fs.readFileSync(EVENT_LOG_FILE, 'utf8');
    if (!raw.trim()) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const events = parsed as RuntimeModelEvent[];
    if (typeof limit === 'number' && limit > 0) {
      return events.slice(-limit);
    }
    return events;
  } catch {
    return [];
  }
}

// ── Write ─────────────────────────────────────────────────────────────────

export function appendRuntimeModelEvent(
  event: Omit<RuntimeModelEvent, 'id' | 'createdAt'>,
): void {
  try {
    ensureEventLogDir();
    const existing = listRuntimeModelEvents();
    const newEvent: RuntimeModelEvent = {
      ...event,
      id: generateEventId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...existing, newEvent].slice(-MAX_EVENTS);
    fs.writeFileSync(EVENT_LOG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch {
    // Swallow write errors — event logging must not break chat flow
  }
}

// ── Clear ─────────────────────────────────────────────────────────────────

export function clearRuntimeModelEvents(): void {
  try {
    ensureEventLogDir();
    fs.writeFileSync(EVENT_LOG_FILE, '[]', 'utf8');
  } catch {
    // Swallow
  }
}

// ── Summary helpers ───────────────────────────────────────────────────────

export function getRuntimeEventLogSummary(): {
  count: number;
  lastEventAt: string | null;
  ready: boolean;
} {
  try {
    const events = listRuntimeModelEvents();
    const last = events.length > 0 ? events[events.length - 1] : null;
    return {
      count: events.length,
      lastEventAt: last?.createdAt ?? null,
      ready: true,
    };
  } catch {
    return { count: 0, lastEventAt: null, ready: false };
  }
}
