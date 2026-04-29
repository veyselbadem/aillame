import {
  checkGemmaServerHealth,
  ensureGemmaServerRunning,
  GemmaRuntimeError,
  getGemmaRuntimeStatus,
} from './gemma-runtime-manager';

export type GemmaWarmupStatus = 'idle' | 'starting' | 'running' | 'skipped' | 'failed';

export type GemmaWarmupResult = {
  success: boolean;
  started: boolean;
  running: boolean;
  starting: boolean;
  serverUrl: string;
  autoStart: boolean;
  startOnAppBoot: boolean;
  warmupStatus: GemmaWarmupStatus;
  code?: string;
  reason?: string;
  error?: string;
  lastWarmupError?: string;
};

let warmupPromise: Promise<GemmaWarmupResult> | null = null;
let warmupStatus: GemmaWarmupStatus = 'idle';
let lastWarmupError: string | undefined;
let warmupTriggered = false;

function getServerUrl(): string {
  return process.env.AILLAME_GEMMA_SERVER_URL || 'http://127.0.0.1:8080';
}

function isLocalServerUrl(serverUrl: string): boolean {
  try {
    const url = new URL(serverUrl);
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isStartOnAppBootEnabled(): boolean {
  return process.env.AILLAME_GEMMA_START_ON_APP_BOOT === 'true';
}

function isAutoStartEnabled(): boolean {
  return process.env.AILLAME_GEMMA_AUTO_START === 'true';
}

function buildResult(overrides: Partial<GemmaWarmupResult> = {}): GemmaWarmupResult {
  const serverUrl = getServerUrl();
  return {
    success: false,
    started: false,
    running: false,
    starting: warmupStatus === 'starting',
    serverUrl,
    autoStart: isAutoStartEnabled(),
    startOnAppBoot: isStartOnAppBootEnabled(),
    warmupStatus,
    lastWarmupError,
    ...overrides,
  };
}

async function runWarmup(): Promise<GemmaWarmupResult> {
  const serverUrl = getServerUrl();

  if (!isStartOnAppBootEnabled()) {
    warmupStatus = 'skipped';
    return buildResult({
      code: 'startup_disabled',
      error: 'Gemma app boot startup disabled.',
      reason: 'startup_disabled',
    });
  }

  if (!isAutoStartEnabled()) {
    warmupStatus = 'skipped';
    return buildResult({
      code: 'auto_start_disabled',
      error: 'Gemma auto-start disabled.',
      reason: 'auto_start_disabled',
    });
  }

  if (!isLocalServerUrl(serverUrl)) {
    warmupStatus = 'skipped';
    return buildResult({
      code: 'non_local_server',
      error: 'Gemma app boot startup requires a local server URL.',
      reason: 'non_local_server',
    });
  }

  if (await checkGemmaServerHealth(serverUrl)) {
    warmupStatus = 'running';
    lastWarmupError = undefined;
    return buildResult({
      success: true,
      started: false,
      running: true,
      starting: false,
      reason: 'already_running',
    });
  }

  const runtimeStatus = await getGemmaRuntimeStatus();
  if (!runtimeStatus.modelPathConfigured || !runtimeStatus.llamaServerPathConfigured) {
    warmupStatus = 'failed';
    lastWarmupError = 'Gemma auto-start path ayarlar\u0131 eksik.';
    return buildResult({
      code: 'runtime_not_configured',
      error: lastWarmupError,
      reason: 'runtime_not_configured',
    });
  }

  warmupStatus = 'starting';
  lastWarmupError = undefined;

  try {
    await ensureGemmaServerRunning();
    warmupStatus = 'running';
    return buildResult({
      success: true,
      started: true,
      running: true,
      starting: false,
    });
  } catch (error: any) {
    warmupStatus = 'failed';
    lastWarmupError = error instanceof Error ? error.message : 'Gemma runtime warm-up failed.';
    const code = error instanceof GemmaRuntimeError ? error.code : 'runtime_start_failed';
    const resultCode = code === 'invalid_config' ? 'runtime_not_configured' : code;
    return buildResult({
      code: resultCode,
      error: lastWarmupError,
      reason: resultCode,
    });
  }
}

export function getGemmaWarmupSnapshot(): GemmaWarmupResult {
  return buildResult();
}

export async function warmUpGemmaRuntime(options: { wait?: boolean } = {}): Promise<GemmaWarmupResult> {
  if (warmupPromise) {
    return options.wait ? warmupPromise : buildResult({ starting: true });
  }

  if (warmupTriggered && (warmupStatus === 'running' || warmupStatus === 'starting')) {
    const running = warmupStatus === 'running' ? true : await checkGemmaServerHealth(getServerUrl());
    if (running) warmupStatus = 'running';
    return buildResult({ success: running, running, starting: warmupStatus === 'starting' });
  }

  warmupTriggered = true;
  warmupPromise = runWarmup().finally(() => {
    warmupPromise = null;
  });

  return options.wait ? warmupPromise : buildResult({ starting: true });
}
