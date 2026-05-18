import { NextRequest, NextResponse } from 'next/server';
import { VlmInferenceAdapter } from '@core/nano/vision/vlm-inference-adapter';
import {
  createQwenSafeRuntimeInfo,
  getRecommendedQwenGpuLayers,
  getLocalSafeRuntimeResourceMetrics,
} from '@core/runtime/safe-runtime-profile';
import {
  acquireGpuHeavyLock,
  getGpuHeavyLockStatus,
  releaseGpuHeavyLock,
} from '@core/runtime/gpu-heavy-lock';
import fs from 'fs';

export const runtime = 'nodejs';

const MODEL_ID = 'qwen3-vl-4b-instruct-q4-k-m';
const MODEL_NAME = 'Qwen3-VL 4B Nano Vision';
const MODEL_PATH = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\model.gguf';
const MMPROJ_PATH = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\mmproj.gguf';
const MINI_TEST_PROFILE = 'low' as const;
const MINI_TEST_GPU_LAYERS = getRecommendedQwenGpuLayers(MINI_TEST_PROFILE);

// 10x10 red square PNG.
const TEST_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FAP5FDv1L+GawAAAAAElFTkSuQmCC';

async function parseRequestAllowDevInference(req: NextRequest): Promise<boolean> {
  if (req.nextUrl.searchParams.get('allowDevInference') === 'true') return true;
  try {
    const body = await req.clone().json();
    return body?.allowDevInference === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const filesReady = fs.existsSync(MODEL_PATH) && fs.existsSync(MMPROJ_PATH);
  const initialLockStatus = getGpuHeavyLockStatus();
  const safeRuntime = createQwenSafeRuntimeInfo(await getLocalSafeRuntimeResourceMetrics(), {
    preflightOnly: false,
    inferenceExecuted: false,
    activeGpuTask: initialLockStatus.owner,
    profileOverride: MINI_TEST_PROFILE,
  });

  if (!filesReady) {
    return NextResponse.json({
      ok: false,
      modelId: MODEL_ID,
      inferenceExecuted: false,
      errors: ['Saglik kontrolu basarisiz: Model dosyalari eksik.'],
      gpuHeavyLock: initialLockStatus,
      safeRuntime,
      message: 'Mini gorsel anlama testi tamamlanamadi.',
    });
  }

  if (!safeRuntime.preflight?.ok) {
    return NextResponse.json({
      ok: false,
      modelId: MODEL_ID,
      inferenceExecuted: false,
      errors: safeRuntime.preflight?.errors ?? ['Guvenli runtime preflight basarisiz.'],
      gpuHeavyLock: initialLockStatus,
      safeRuntime,
      message: 'Mini gorsel anlama testi guvenli runtime kontrolu nedeniyle baslatilmadi.',
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const envAllowed = process.env.AILLAME_ALLOW_DEV_NATIVE_INFERENCE === 'true';
  const requestAllowed = await parseRequestAllowDevInference(req);
  const allowDevInference = envAllowed && requestAllowed;

  let devNativeInferenceWarning: string | null = null;
  if (!isProduction) {
    if (allowDevInference) {
      devNativeInferenceWarning = 'Geliştirme modunda native inference manuel olarak etkinleştirildi; crash riski vardır.';
    } else if (requestAllowed && !envAllowed) {
      devNativeInferenceWarning = 'Geliştirme modunda native GGUF inference güvenlik nedeniyle çalıştırılmadı. Gerçek inference için AILLAME_ALLOW_DEV_NATIVE_INFERENCE=true ortam değişkeni de ayarlanmalıdır.';
    } else {
      devNativeInferenceWarning = 'Geliştirme modunda native GGUF inference güvenlik nedeniyle çalıştırılmadı.';
    }
  }

  if (!isProduction && !allowDevInference) {
    return NextResponse.json({
      ok: true,
      modelId: MODEL_ID,
      modelName: MODEL_NAME,
      testType: 'mini-vision-inference',
      dryRun: true,
      inferenceExecuted: false,
      safeRuntime: {
        profile: MINI_TEST_PROFILE,
        recommendedGpuLayers: MINI_TEST_GPU_LAYERS,
        preflightPassed: safeRuntime.preflight?.ok ?? false,
        resources: {
          freeRamMb: safeRuntime.resources.freeRamMb,
          freeVramMb: safeRuntime.resources.freeVramMb,
          vramSource: safeRuntime.resources.vramSource,
          warnings: safeRuntime.resources.warnings,
        },
        preflight: safeRuntime.preflight,
      },
      files: {
        modelPath: MODEL_PATH,
        modelExists: fs.existsSync(MODEL_PATH),
        mmprojPath: MMPROJ_PATH,
        mmprojExists: fs.existsSync(MMPROJ_PATH),
      },
      gpuHeavyLock: initialLockStatus,
      warnings: devNativeInferenceWarning ? [devNativeInferenceWarning] : [],
      message: 'Mini görsel testi dry-run olarak tamamlandı. Gerçek inference production/worker ortamında veya açık izinli güvenli modda çalıştırılmalıdır.',
    });
  }

  const lockResult = acquireGpuHeavyLock('qwen-vlm', {
    reason: 'Qwen3-VL 4B mini vision test',
    metadata: {
      endpoint: '/api/aillame/vision/mini-test',
      modelId: MODEL_ID,
      profile: MINI_TEST_PROFILE,
      gpuLayers: MINI_TEST_GPU_LAYERS,
      allowDevInference,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  });

  if (!lockResult.acquired || !lockResult.lock) {
    return NextResponse.json({
      ok: false,
      modelId: MODEL_ID,
      inferenceExecuted: false,
      errors: [lockResult.message],
      gpuHeavyLock: lockResult.status,
      safeRuntime,
      warnings: devNativeInferenceWarning ? [devNativeInferenceWarning] : [],
      message: 'Mini gorsel anlama testi baska bir agir GPU islemi nedeniyle baslatilmadi.',
    });
  }

  const prompt = 'Bu gorselde ne goruyorsun? Kisa cevap ver.';
  const startTime = Date.now();

  try {
    const result = await VlmInferenceAdapter.analyzeImage({
      modelId: MODEL_ID,
      image: TEST_IMAGE,
      prompt,
      maxTokens: 30,
      gpuLayers: MINI_TEST_GPU_LAYERS,
      runtimeProfile: MINI_TEST_PROFILE,
    });

    const runtimeAfterInference = {
      ...safeRuntime,
      inferenceExecuted: true,
    };
    const durationMs = Date.now() - startTime;

    if (!result.success) {
      return NextResponse.json({
        ok: false,
        modelId: MODEL_ID,
        inferenceExecuted: true,
        errors: [result.message || 'VlmInferenceAdapter yanit uretemedi.', result.errorCode || 'UNKNOWN_ERROR'],
        gpuHeavyLock: getGpuHeavyLockStatus(),
        safeRuntime: runtimeAfterInference,
        warnings: devNativeInferenceWarning ? [devNativeInferenceWarning] : [],
        message: 'Mini gorsel anlama testi basarisiz oldu.',
      });
    }

    return NextResponse.json({
      ok: true,
      modelId: MODEL_ID,
      modelName: MODEL_NAME,
      testType: 'mini-vision-inference',
      inferenceExecuted: true,
      prompt,
      response: result.text,
      durationMs,
      gpuHeavyLock: getGpuHeavyLockStatus(),
      safeRuntime: runtimeAfterInference,
      warnings: devNativeInferenceWarning ? [devNativeInferenceWarning] : [],
      message: 'Mini gorsel anlama testi basariyla tamamlandi.',
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      modelId: MODEL_ID,
      inferenceExecuted: false,
      errors: [error.message || 'Beklenmeyen bir hata olustu.'],
      gpuHeavyLock: getGpuHeavyLockStatus(),
      safeRuntime,
      warnings: devNativeInferenceWarning ? [devNativeInferenceWarning] : [],
      message: 'Mini gorsel anlama testi tamamlanamadi.',
    });
  } finally {
    releaseGpuHeavyLock(lockResult.lock.id);
  }
}
