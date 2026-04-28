import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

export type GemmaRuntimeStatus = {
  success: true;
  serverUrl: string;
  autoStart: boolean;
  running: boolean;
  starting: boolean;
  modelPathConfigured: boolean;
  llamaServerPathConfigured: boolean;
  lastError?: string;
};

export class GemmaRuntimeError extends Error {
  code:
    | 'auto_start_disabled'
    | 'invalid_config'
    | 'server_offline'
    | 'startup_timeout'
    | 'startup_failed';
  hint?: string;

  constructor(message: string, options: { code: GemmaRuntimeError['code']; hint?: string }) {
    super(message);
    this.name = 'GemmaRuntimeError';
    this.code = options.code;
    this.hint = options.hint;
  }
}

type GemmaRuntimeConfig = {
  autoStart: boolean;
  serverUrl: string;
  llamaServerExe: string;
  modelPath: string;
  port: number;
  contextSize: number;
  startupTimeoutMs: number;
};

let startPromise: Promise<void> | null = null;
let managedProcess: ChildProcess | null = null;
let lastError: string | undefined;
let recentLog = '';

function getConfig(): GemmaRuntimeConfig {
  const serverUrl = process.env.AILLAME_GEMMA_SERVER_URL || 'http://127.0.0.1:8080';
  const parsedUrl = new URL(serverUrl);
  const port = Number(process.env.AILLAME_GEMMA_PORT || parsedUrl.port || '8080');

  return {
    autoStart: process.env.AILLAME_GEMMA_AUTO_START === 'true',
    serverUrl,
    llamaServerExe: process.env.AILLAME_GEMMA_LLAMA_SERVER_EXE || '',
    modelPath: process.env.AILLAME_GEMMA_MODEL_PATH || '',
    port,
    contextSize: Number(process.env.AILLAME_GEMMA_CONTEXT_SIZE || '8192'),
    startupTimeoutMs: Number(process.env.AILLAME_GEMMA_STARTUP_TIMEOUT_MS || '60000'),
  };
}

function isLocalServerUrl(serverUrl: string): boolean {
  try {
    const url = new URL(serverUrl);
    return (
      url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function validateRuntimeConfig(config: GemmaRuntimeConfig): void {
  if (!isLocalServerUrl(config.serverUrl)) {
    throw new GemmaRuntimeError('Gemma auto-start sadece lokal server URL ile kullanılabilir.', {
      code: 'invalid_config',
      hint: 'AILLAME_GEMMA_SERVER_URL değerini http://127.0.0.1:8080 yapın.',
    });
  }

  if (!config.llamaServerExe || !path.isAbsolute(config.llamaServerExe)) {
    throw new GemmaRuntimeError('llama-server.exe yolu yapılandırılmamış veya mutlak yol değil.', {
      code: 'invalid_config',
      hint: 'AILLAME_GEMMA_LLAMA_SERVER_EXE=C:\\aillame-llama\\llama-server.exe olarak ayarlayın.',
    });
  }

  if (!config.modelPath || !path.isAbsolute(config.modelPath)) {
    throw new GemmaRuntimeError('Gemma GGUF model yolu yapılandırılmamış veya mutlak yol değil.', {
      code: 'invalid_config',
      hint: 'AILLAME_GEMMA_MODEL_PATH değerini Gemma GGUF dosyasına ayarlayın.',
    });
  }

  if (!config.llamaServerExe.toLowerCase().endsWith('.exe') || !existsSync(config.llamaServerExe)) {
    throw new GemmaRuntimeError('llama-server.exe bulunamadı.', {
      code: 'invalid_config',
      hint: 'AILLAME_GEMMA_LLAMA_SERVER_EXE yolunu kontrol edin.',
    });
  }

  if (!config.modelPath.toLowerCase().endsWith('.gguf') || !existsSync(config.modelPath)) {
    throw new GemmaRuntimeError('Gemma GGUF model dosyası bulunamadı.', {
      code: 'invalid_config',
      hint: 'AILLAME_GEMMA_MODEL_PATH yolunu kontrol edin.',
    });
  }

  if (!Number.isFinite(config.port) || config.port < 1 || config.port > 65535) {
    throw new GemmaRuntimeError('Gemma port ayarı geçersiz.', {
      code: 'invalid_config',
      hint: 'AILLAME_GEMMA_PORT değerini 8080 gibi geçerli bir port yapın.',
    });
  }
}

async function fetchOk(url: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkGemmaServerHealth(serverUrl = getConfig().serverUrl): Promise<boolean> {
  const normalized = serverUrl.replace(/\/$/, '');
  if (await fetchOk(`${normalized}/v1/models`)) return true;
  return fetchOk(`${normalized}/health`);
}

function rememberLog(chunk: Buffer): void {
  const text = chunk.toString('utf8').trim();
  if (!text) return;
  recentLog = `${recentLog}\n${text}`.slice(-2000);
}

export async function startGemmaServer(): Promise<void> {
  const config = getConfig();
  validateRuntimeConfig(config);

  const args = [
    '-m',
    config.modelPath,
    '--port',
    String(config.port),
    '-c',
    String(config.contextSize),
  ];

  recentLog = '';
  lastError = undefined;

  const child = spawn(config.llamaServerExe, args, {
    cwd: path.dirname(config.llamaServerExe),
    detached: true,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  managedProcess = child;

  child.stdout?.on('data', rememberLog);
  child.stderr?.on('data', rememberLog);
  child.on('error', (error) => {
    lastError = error.message;
  });
  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      lastError = `llama-server beklenmeden kapandı: code=${code}${signal ? ` signal=${signal}` : ''}`;
    }
    managedProcess = null;
  });

  child.unref();
}

export async function waitForGemmaServerReady(timeoutMs = getConfig().startupTimeoutMs): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await checkGemmaServerHealth()) return;
    if (lastError) {
      throw new GemmaRuntimeError('Gemma local server başlatılamadı.', {
        code: 'startup_failed',
        hint: lastError,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new GemmaRuntimeError('Gemma local server hazır olana kadar bekleme süresi doldu.', {
    code: 'startup_timeout',
    hint: 'AILLAME_GEMMA_STARTUP_TIMEOUT_MS değerini artırın veya llama-server loglarını kontrol edin.',
  });
}

export async function ensureGemmaServerRunning(): Promise<void> {
  const config = getConfig();

  if (await checkGemmaServerHealth(config.serverUrl)) return;

  if (!config.autoStart) {
    throw new GemmaRuntimeError('Gemma local server kapalı ve auto-start devre dışı.', {
      code: 'auto_start_disabled',
      hint: 'Manuel başlatma yapın veya AILLAME_GEMMA_AUTO_START=true ayarlayın.',
    });
  }

  if (startPromise) {
    await startPromise;
    return;
  }

  startPromise = (async () => {
    await startGemmaServer();
    await waitForGemmaServerReady(config.startupTimeoutMs);
  })();

  try {
    await startPromise;
  } finally {
    startPromise = null;
  }
}

export async function getGemmaRuntimeStatus(): Promise<GemmaRuntimeStatus> {
  const config = getConfig();
  const running = await checkGemmaServerHealth(config.serverUrl);

  return {
    success: true,
    serverUrl: config.serverUrl,
    autoStart: config.autoStart,
    running,
    starting: Boolean(startPromise),
    modelPathConfigured: Boolean(config.modelPath && path.isAbsolute(config.modelPath) && existsSync(config.modelPath)),
    llamaServerPathConfigured: Boolean(config.llamaServerExe && path.isAbsolute(config.llamaServerExe) && existsSync(config.llamaServerExe)),
    lastError,
  };
}
