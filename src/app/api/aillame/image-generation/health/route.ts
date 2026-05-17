import { NextResponse } from 'next/server';
import fs from 'fs';
import {
  createSdxlSafeRuntimeInfo,
  getLocalSafeRuntimeResourceMetrics,
} from '@core/runtime/safe-runtime-profile';
import { getGpuHeavyLockStatus } from '@core/runtime/gpu-heavy-lock';

export const runtime = 'nodejs';

const SDXL_MODEL_ID = 'sdxl-turbo-1.0';
const SDXL_DIFFUSERS_PATH = 'C:\\aillame-models\\diffusion\\sdxl-turbo-1.0';
const SDXL_SAFETENSORS_PATH = 'C:\\aillame-models\\diffusion\\sd_xl_turbo_1.0_fp16.safetensors';

export async function GET() {
  const diffusersExists = fs.existsSync(SDXL_DIFFUSERS_PATH);
  const safetensorsExists = fs.existsSync(SDXL_SAFETENSORS_PATH);
  const runtimeEnabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
  const cpuFallbackAllowed = process.env.AILLAME_IGM_ALLOW_CPU_FALLBACK === 'true';
  const gpuHeavyLock = getGpuHeavyLockStatus();
  const safeRuntime = createSdxlSafeRuntimeInfo(await getLocalSafeRuntimeResourceMetrics(), {
    preflightOnly: true,
    inferenceExecuted: false,
    runtimeEnabled,
    activeGpuTask: gpuHeavyLock.owner,
  });

  return NextResponse.json({
    ok: diffusersExists && safetensorsExists,
    model: {
      id: SDXL_MODEL_ID,
      name: 'SDXL Turbo',
      type: 'image-generation',
      local: true,
    },
    files: {
      diffusersPath: SDXL_DIFFUSERS_PATH,
      diffusersExists,
      safetensorsPath: SDXL_SAFETENSORS_PATH,
      safetensorsExists,
    },
    runtime: {
      enabled: runtimeEnabled,
      cpuFallbackAllowed,
      inferenceExecuted: false,
      message: runtimeEnabled
        ? 'Görsel üretim runtimeı yapılandırma kontrolünden geçiriliyor.'
        : 'Görsel üretim runtimeı kapalı.',
    },
    gpuHeavyLock,
    safeRuntime,
  });
}
