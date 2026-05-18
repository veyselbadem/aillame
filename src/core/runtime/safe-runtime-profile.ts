import { execFile } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type SafeRuntimeProfile = 'low' | 'balanced' | 'high';

export type GpuHeavyTask = 'qwen-vlm' | 'sdxl-turbo' | 'nano-training';

export type ActiveGpuTask = GpuHeavyTask | null | undefined;

export interface SafeRuntimeResourceSnapshot {
  freeRamMb: number;
  freeVramMb?: number;
  activeGpuTask?: ActiveGpuTask;
}

export interface NanoTrainingPreflightInput {
  freeRamMb: number;
  activeGpuTask?: ActiveGpuTask;
  isPluggedIn?: boolean;
}

export interface RuntimePreflightResult {
  ok: boolean;
  profile: SafeRuntimeProfile;
  task: GpuHeavyTask;
  recommendedGpuLayers?: number;
  errors: string[];
  warnings: string[];
  message: string;
}

export interface SafeRuntimeResourceMetrics {
  freeRamMb: number;
  freeVramMb?: number;
  vramSource: 'nvidia-smi' | 'unavailable';
  warnings: string[];
}

export interface SafeRuntimeResponseInfo {
  profile: SafeRuntimeProfile;
  qwenRecommendedGpuLayers: number;
  preflightOnly: boolean;
  inferenceExecuted: boolean;
  messages: string[];
  warnings: string[];
  resources: SafeRuntimeResourceMetrics;
  preflight?: RuntimePreflightResult;
}

export interface SdxlSafeRuntimeResponseInfo {
  task: 'sdxl-turbo';
  preflightOnly: boolean;
  inferenceExecuted: boolean;
  freeRamMb: number;
  freeVramMb?: number;
  minFreeRamMb: number;
  minFreeVramMb: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  message: string;
  resources: SafeRuntimeResourceMetrics;
  preflight: RuntimePreflightResult;
}

export interface RuntimeProfileConfig {
  defaultProfile: SafeRuntimeProfile;
  qwenGpuLayers: Record<SafeRuntimeProfile, number>;
  qwenMinFreeVramMb: Record<SafeRuntimeProfile, number>;
  sdxlMinFreeVramMb: number;
  miniTestMinFreeRamMb: number;
  sdxlJobMinFreeRamMb: number;
  nanoTrainingMinFreeRamMb: number;
  gpuHeavySingleton: boolean;
}

export const SAFE_RUNTIME_MESSAGES = {
  insufficientGpuMemory: 'GPU belleği yetersiz, işlem başlatılmadı.',
  insufficientRam: 'RAM yetersiz, işlem başlatılmadı.',
  gpuTaskInProgress: 'Başka bir ağır GPU işlemi devam ediyor.',
  qwenLowProfile: 'Qwen3-VL 4B düşük güvenli profille başlatılacak.',
  qwenBalancedProfile: 'Qwen3-VL 4B dengeli profille başlatılacak.',
  highProfileInsufficientGpu: 'Yüksek performans profili için yeterli GPU belleği yok.',
  sdxlCheckingGpu: 'SDXL Turbo için GPU belleği kontrol ediliyor.',
  cpuFallbackActive: 'CPU fallback aktif, işlem daha yavaş sürebilir.',
  nanoRouting: 'Aillame Nano isteği uygun araca yönlendiriyor.',
  imageRuntimeDisabled: 'Görsel üretim runtime’ı kapalı.',
  nanoTrainingReady: 'Aillame Nano eğitim bloğu güvenli koşullarda başlatılabilir.',
} as const;

export const SAFE_RUNTIME_DEFAULTS: RuntimeProfileConfig = {
  defaultProfile: 'balanced',
  qwenGpuLayers: {
    low: 20,
    balanced: 35,
    high: 50,
  },
  qwenMinFreeVramMb: {
    low: 4500,
    balanced: 6500,
    high: 7000,
  },
  sdxlMinFreeVramMb: 6500,
  miniTestMinFreeRamMb: 6000,
  sdxlJobMinFreeRamMb: 8000,
  nanoTrainingMinFreeRamMb: 10000,
  gpuHeavySingleton: true,
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseProfile(value: string | undefined, fallback: SafeRuntimeProfile): SafeRuntimeProfile {
  if (value === 'low' || value === 'balanced' || value === 'high') return value;
  return fallback;
}

function hasBlockingGpuTask(
  activeGpuTask: ActiveGpuTask,
  requestedTask: GpuHeavyTask,
  singletonEnabled: boolean
): boolean {
  return Boolean(singletonEnabled && activeGpuTask && activeGpuTask !== requestedTask);
}

export function getRuntimeProfileFromEnv(env: NodeJS.ProcessEnv = process.env): RuntimeProfileConfig {
  const qwenMinFreeVramMb = parsePositiveInt(
    env.AILLAME_QWEN_MIN_FREE_VRAM_MB,
    SAFE_RUNTIME_DEFAULTS.qwenMinFreeVramMb.balanced
  );

  return {
    defaultProfile: parseProfile(env.AILLAME_RUNTIME_PROFILE, SAFE_RUNTIME_DEFAULTS.defaultProfile),
    qwenGpuLayers: {
      low: parsePositiveInt(env.AILLAME_QWEN_GPU_LAYERS_LOW, SAFE_RUNTIME_DEFAULTS.qwenGpuLayers.low),
      balanced: parsePositiveInt(
        env.AILLAME_QWEN_GPU_LAYERS_BALANCED,
        SAFE_RUNTIME_DEFAULTS.qwenGpuLayers.balanced
      ),
      high: parsePositiveInt(env.AILLAME_QWEN_GPU_LAYERS_HIGH, SAFE_RUNTIME_DEFAULTS.qwenGpuLayers.high),
    },
    qwenMinFreeVramMb: {
      low: SAFE_RUNTIME_DEFAULTS.qwenMinFreeVramMb.low,
      balanced: qwenMinFreeVramMb,
      high: Math.max(qwenMinFreeVramMb, SAFE_RUNTIME_DEFAULTS.qwenMinFreeVramMb.high),
    },
    sdxlMinFreeVramMb: parsePositiveInt(
      env.AILLAME_SDXL_MIN_FREE_VRAM_MB,
      SAFE_RUNTIME_DEFAULTS.sdxlMinFreeVramMb
    ),
    miniTestMinFreeRamMb: SAFE_RUNTIME_DEFAULTS.miniTestMinFreeRamMb,
    sdxlJobMinFreeRamMb: SAFE_RUNTIME_DEFAULTS.sdxlJobMinFreeRamMb,
    nanoTrainingMinFreeRamMb: SAFE_RUNTIME_DEFAULTS.nanoTrainingMinFreeRamMb,
    gpuHeavySingleton: parseBoolean(
      env.AILLAME_GPU_HEAVY_SINGLETON,
      SAFE_RUNTIME_DEFAULTS.gpuHeavySingleton
    ),
  };
}

export function getQwenProfileForFreeVram(
  freeVramMb: number,
  config: RuntimeProfileConfig = getRuntimeProfileFromEnv()
): SafeRuntimeProfile {
  if (freeVramMb >= config.qwenMinFreeVramMb.high) return 'high';
  if (freeVramMb >= config.qwenMinFreeVramMb.balanced) return 'balanced';
  return 'low';
}

export function getRecommendedQwenGpuLayers(
  profile: SafeRuntimeProfile,
  config: RuntimeProfileConfig = getRuntimeProfileFromEnv()
): number {
  return config.qwenGpuLayers[profile];
}

export function canRunQwenMiniTest(
  input: SafeRuntimeResourceSnapshot,
  config: RuntimeProfileConfig = getRuntimeProfileFromEnv()
): RuntimePreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const freeVramMb = input.freeVramMb ?? 0;
  const profile = getQwenProfileForFreeVram(freeVramMb, config);

  if (input.freeRamMb < config.miniTestMinFreeRamMb) {
    errors.push(SAFE_RUNTIME_MESSAGES.insufficientRam);
  }

  if (freeVramMb < config.qwenMinFreeVramMb.low) {
    errors.push(SAFE_RUNTIME_MESSAGES.insufficientGpuMemory);
  }

  if (hasBlockingGpuTask(input.activeGpuTask, 'qwen-vlm', config.gpuHeavySingleton)) {
    errors.push(SAFE_RUNTIME_MESSAGES.gpuTaskInProgress);
  }

  if (profile === 'high' && freeVramMb < config.qwenMinFreeVramMb.high) {
    warnings.push(SAFE_RUNTIME_MESSAGES.highProfileInsufficientGpu);
  }

  const ok = errors.length === 0;
  const message = ok
    ? profile === 'low'
      ? SAFE_RUNTIME_MESSAGES.qwenLowProfile
      : SAFE_RUNTIME_MESSAGES.qwenBalancedProfile
    : errors[0];

  return {
    ok,
    profile,
    task: 'qwen-vlm',
    recommendedGpuLayers: getRecommendedQwenGpuLayers(profile, config),
    errors,
    warnings,
    message,
  };
}

export function canRunSdxlJob(
  input: SafeRuntimeResourceSnapshot,
  config: RuntimeProfileConfig = getRuntimeProfileFromEnv()
): RuntimePreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [SAFE_RUNTIME_MESSAGES.sdxlCheckingGpu];
  const freeVramMb = input.freeVramMb ?? 0;

  if (input.freeRamMb < config.sdxlJobMinFreeRamMb) {
    errors.push(SAFE_RUNTIME_MESSAGES.insufficientRam);
  }

  if (freeVramMb < config.sdxlMinFreeVramMb) {
    errors.push(SAFE_RUNTIME_MESSAGES.insufficientGpuMemory);
    warnings.push(SAFE_RUNTIME_MESSAGES.cpuFallbackActive);
  }

  if (hasBlockingGpuTask(input.activeGpuTask, 'sdxl-turbo', config.gpuHeavySingleton)) {
    errors.push(SAFE_RUNTIME_MESSAGES.gpuTaskInProgress);
  }

  return {
    ok: errors.length === 0,
    profile: config.defaultProfile,
    task: 'sdxl-turbo',
    errors,
    warnings,
    message: errors[0] ?? SAFE_RUNTIME_MESSAGES.sdxlCheckingGpu,
  };
}

export function canRunNanoTrainingBlock(
  input: NanoTrainingPreflightInput,
  config: RuntimeProfileConfig = getRuntimeProfileFromEnv()
): RuntimePreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.freeRamMb < config.nanoTrainingMinFreeRamMb) {
    errors.push(SAFE_RUNTIME_MESSAGES.insufficientRam);
  }

  if (hasBlockingGpuTask(input.activeGpuTask, 'nano-training', config.gpuHeavySingleton)) {
    errors.push(SAFE_RUNTIME_MESSAGES.gpuTaskInProgress);
  }

  if (input.isPluggedIn === false) {
    warnings.push('Gece/boşta eğitim için cihazın prize takılı olması önerilir.');
  }

  return {
    ok: errors.length === 0,
    profile: 'low',
    task: 'nano-training',
    errors,
    warnings,
    message: errors[0] ?? SAFE_RUNTIME_MESSAGES.nanoTrainingReady,
  };
}

export async function getLocalSafeRuntimeResourceMetrics(): Promise<SafeRuntimeResourceMetrics> {
  const warnings: string[] = [];
  const freeRamMb = Math.round(os.freemem() / (1024 * 1024));

  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      ['--query-gpu=memory.free', '--format=csv,noheader,nounits'],
      { timeout: 2000 }
    );
    const firstValue = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    const freeVramMb = firstValue ? Number.parseInt(firstValue, 10) : undefined;

    if (Number.isFinite(freeVramMb)) {
      return {
        freeRamMb,
        freeVramMb,
        vramSource: 'nvidia-smi',
        warnings,
      };
    }
  } catch (error) {
    warnings.push('GPU bellek ölçümü alınamadı; nvidia-smi kullanılamıyor olabilir.');
  }

  return {
    freeRamMb,
    vramSource: 'unavailable',
    warnings,
  };
}

export function createQwenSafeRuntimeInfo(
  resources: SafeRuntimeResourceMetrics,
  options: {
    preflightOnly: boolean;
    inferenceExecuted: boolean;
    activeGpuTask?: ActiveGpuTask;
    profileOverride?: SafeRuntimeProfile;
  }
): SafeRuntimeResponseInfo {
  const config = getRuntimeProfileFromEnv();
  const profile = options.profileOverride ?? getQwenProfileForFreeVram(resources.freeVramMb ?? 0, config);
  const preflight = canRunQwenMiniTest(
    {
      freeRamMb: resources.freeRamMb,
      freeVramMb: resources.freeVramMb,
      activeGpuTask: options.activeGpuTask,
    },
    config
  );

  return {
    profile,
    qwenRecommendedGpuLayers: getRecommendedQwenGpuLayers(profile, config),
    preflightOnly: options.preflightOnly,
    inferenceExecuted: options.inferenceExecuted,
    messages: [preflight.message],
    warnings: [...resources.warnings, ...preflight.warnings],
    resources,
    preflight: {
      ...preflight,
      profile,
      recommendedGpuLayers: getRecommendedQwenGpuLayers(profile, config),
    },
  };
}

export function createSdxlSafeRuntimeInfo(
  resources: SafeRuntimeResourceMetrics,
  options: {
    preflightOnly: boolean;
    inferenceExecuted: boolean;
    runtimeEnabled?: boolean;
    activeGpuTask?: ActiveGpuTask;
  }
): SdxlSafeRuntimeResponseInfo {
  const config = getRuntimeProfileFromEnv();
  const preflight = canRunSdxlJob(
    {
      freeRamMb: resources.freeRamMb,
      freeVramMb: resources.freeVramMb,
      activeGpuTask: options.activeGpuTask,
    },
    config
  );
  const errors = [...preflight.errors];

  if (options.runtimeEnabled === false) {
    errors.unshift(SAFE_RUNTIME_MESSAGES.imageRuntimeDisabled);
  }

  return {
    task: 'sdxl-turbo',
    preflightOnly: options.preflightOnly,
    inferenceExecuted: options.inferenceExecuted,
    freeRamMb: resources.freeRamMb,
    freeVramMb: resources.freeVramMb,
    minFreeRamMb: config.sdxlJobMinFreeRamMb,
    minFreeVramMb: config.sdxlMinFreeVramMb,
    ok: errors.length === 0,
    errors,
    warnings: [...resources.warnings, ...preflight.warnings],
    message: errors[0] ?? preflight.message,
    resources,
    preflight,
  };
}
