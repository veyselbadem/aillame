import { NextRequest, NextResponse } from 'next/server';
import { NativeDiffusionAdapter } from '@/services/vision/native-diffusion-adapter';
import { validateRequest } from '../../../models/auth-helper';
import { ApiResponseHelper } from '@/utils/api-response';
import {
  createSdxlSafeRuntimeInfo,
  getLocalSafeRuntimeResourceMetrics,
} from '@core/runtime/safe-runtime-profile';
import {
  acquireGpuHeavyLock,
  getGpuHeavyLockStatus,
  releaseGpuHeavyLock,
} from '@core/runtime/gpu-heavy-lock';

export async function POST(req: NextRequest) {
  // 1. Auth check
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json();
    const { prompt, width, height, steps, negativePrompt } = body;
    const isDryRun = req.nextUrl.searchParams.get('dryRun') === 'true' || body?.dryRun === true;

    if (!prompt) {
      return NextResponse.json(
        ApiResponseHelper.error('PROMPT_REQUIRED', 'Görsel üretimi için prompt gereklidir.'),
        { status: 400 }
      );
    }

    // 2. Safe Runtime Preflight
    const runtimeEnabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
    const initialLockStatus = getGpuHeavyLockStatus();
    const safeRuntime = createSdxlSafeRuntimeInfo(await getLocalSafeRuntimeResourceMetrics(), {
      preflightOnly: false,
      inferenceExecuted: false,
      runtimeEnabled,
      activeGpuTask: initialLockStatus.owner,
    });

    if (!safeRuntime.ok) {
      const isLockError = initialLockStatus.locked && initialLockStatus.owner !== 'sdxl-turbo';
      return NextResponse.json(
        {
          success: false,
          error: isLockError
            ? 'Şu anda başka bir ağır GPU işlemi çalışıyor. Lütfen biraz sonra tekrar deneyin.'
            : safeRuntime.message || 'Görsel üretim güvenlik kontrolünden geçemedi.',
          errors: safeRuntime.errors,
          warnings: safeRuntime.warnings,
          gpuHeavyLock: initialLockStatus,
          safeRuntime,
        },
        { status: 400 }
      );
    }

    // 3. Dry-Run Handling
    if (isDryRun) {
      return NextResponse.json({
        success: true,
        ok: true,
        dryRun: true,
        inferenceExecuted: false,
        gpuHeavyLock: initialLockStatus,
        safeRuntime,
        message: 'Görsel üretim dry-run testi başarıyla tamamlandı.'
      });
    }

    // 4. Acquire GPU Lock
    const lockResult = acquireGpuHeavyLock('sdxl-turbo', {
      reason: 'Native SDXL Turbo image generation api',
      metadata: { endpoint: '/api/aillame/v1/vision/generate', prompt: prompt.slice(0, 100) },
    });

    if (!lockResult.acquired || !lockResult.lock) {
      return NextResponse.json({
        success: false,
        error: 'Şu anda başka bir ağır GPU işlemi çalışıyor. Lütfen biraz sonra tekrar deneyin.',
        errors: [lockResult.message],
        gpuHeavyLock: lockResult.status,
        safeRuntime,
      }, { status: 400 });
    }

    try {
      // 5. Generate Image
      const result = await NativeDiffusionAdapter.generateImage({
        prompt,
        negativePrompt,
        width: width || 512,
        height: height || 512,
        steps: steps || 20
      });

      if (!result.success) {
        return NextResponse.json(
          ApiResponseHelper.error('VISION_GENERATION_FAILED', result.error || 'Görsel üretilemedi.'),
          { status: 500 }
        );
      }

      // 6. Return Success
      return NextResponse.json({
        success: true,
        data: {
          filePath: result.filePath,
          width: result.width,
          height: result.height,
          durationMs: result.durationMs
        },
        gpuHeavyLock: getGpuHeavyLockStatus(),
        safeRuntime: {
          ...safeRuntime,
          inferenceExecuted: true,
        },
        message: "Görsel başarıyla üretildi."
      });
    } finally {
      // 7. Release GPU Lock
      releaseGpuHeavyLock(lockResult.lock.id);
    }

  } catch (error: any) {
    console.error('[VisionAPI] Error:', error);
    return NextResponse.json(
      ApiResponseHelper.error('INTERNAL_ERROR', error.message),
      { status: 500 }
    );
  }
}
