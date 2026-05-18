import net from 'node:net';

export type LocalPortOwner = 'available' | 'aillame' | 'unknown';

export interface LocalPortHealthResult {
  ok: boolean;
  host: string;
  port: number;
  available: boolean;
  occupied: boolean;
  owner: LocalPortOwner;
  message: string;
  recommendation?: string;
}

interface CheckLocalPortOptions {
  port?: number;
  host?: string;
  timeoutMs?: number;
  healthPath?: string;
}

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const DEFAULT_TIMEOUT_MS = 350;
const DEFAULT_HEALTH_PATH = '/api/aillame/health';

function successMessage(port: number) {
  return `${port} portu kullanılabilir.`;
}

function aillameMessage(port: number) {
  return `${port} portu Aillame yerel sunucusu tarafından kullanılıyor.`;
}

function conflictMessage(port: number) {
  return `${port} portu başka bir uygulama tarafından kullanılıyor olabilir.`;
}

async function isAillameServer(host: string, port: number, healthPath: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`http://${host}:${port}${healthPath}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return false;

    const body = await response.json().catch(() => null);
    return body?.success === true && body?.service === 'aillame-external-api';
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function canConnect(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export async function checkLocalPort(options: CheckLocalPortOptions = {}): Promise<LocalPortHealthResult> {
  const host = options.host ?? process.env.AILLAME_LOCAL_SERVER_HOST ?? DEFAULT_HOST;
  const port = options.port ?? Number(process.env.AILLAME_LOCAL_SERVER_PORT || DEFAULT_PORT);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const healthPath = options.healthPath ?? DEFAULT_HEALTH_PATH;

  const aillameRunning = await isAillameServer(host, port, healthPath, timeoutMs);
  if (aillameRunning) {
    return {
      ok: true,
      host,
      port,
      available: false,
      occupied: true,
      owner: 'aillame',
      message: aillameMessage(port),
    };
  }

  const occupied = await canConnect(host, port, timeoutMs);
  if (occupied) {
    return {
      ok: false,
      host,
      port,
      available: false,
      occupied: true,
      owner: 'unknown',
      message: conflictMessage(port),
      recommendation: 'Diğer yerel geliştirme sunucularını kapatıp tekrar deneyin.',
    };
  }

  return {
    ok: true,
    host,
    port,
    available: true,
    occupied: false,
    owner: 'available',
    message: successMessage(port),
  };
}
