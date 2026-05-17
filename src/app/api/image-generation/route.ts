import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { imageGenerationService } from '@/core/runtime/image/image-generation-service';
import { imageJobStore } from '@/core/runtime/image/jobs/image-job-file-store';
import { getProjectRoot, resolveProjectRelative } from '@core/project-root';
import { getActiveImageModelId } from '@core/model-management/active-model-store';
import {
  createSdxlSafeRuntimeInfo,
  getLocalSafeRuntimeResourceMetrics,
} from '@core/runtime/safe-runtime-profile';
import { getGpuHeavyLockStatus } from '@core/runtime/gpu-heavy-lock';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isDryRun = req.nextUrl.searchParams.get('dryRun') === 'true' || body?.dryRun === true;

    // Resolve active image model: user selection → env var → undefined (service decides)
    const activeImageModelId =
      getActiveImageModelId() ||
      process.env.AILLAME_IGM_ACTIVE_MODEL ||
      undefined;

    if (!activeImageModelId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Aktif görsel üretim modeli seçilmemiş. Ayarlar > Yerel Model Envanteri ekranından bir görsel modeli aktif yapın.',
        },
        { status: 422 }
      );
    }

    // Safe Runtime Preflight Check & GPU Lock Check
    const runtimeEnabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
    const gpuHeavyLock = getGpuHeavyLockStatus();
    const safeRuntime = createSdxlSafeRuntimeInfo(await getLocalSafeRuntimeResourceMetrics(), {
      preflightOnly: false,
      inferenceExecuted: false,
      runtimeEnabled,
      activeGpuTask: gpuHeavyLock.owner,
    });

    if (!safeRuntime.ok) {
      const isLockError = gpuHeavyLock.locked && gpuHeavyLock.owner !== 'sdxl-turbo';
      return NextResponse.json(
        {
          ok: false,
          success: false,
          jobCreated: false,
          inferenceExecuted: false,
          error: isLockError
            ? 'Şu anda başka bir ağır GPU işlemi çalışıyor. Lütfen biraz sonra tekrar deneyin.'
            : safeRuntime.message || 'Görsel üretim güvenlik kontrolünden geçemedi.',
          errors: safeRuntime.errors,
          warnings: safeRuntime.warnings,
          gpuHeavyLock,
          safeRuntime,
          message: isLockError
            ? 'Şu anda başka bir ağır GPU işlemi çalışıyor. Lütfen biraz sonra tekrar deneyin.'
            : 'Görsel üretim güvenlik kontrolünden geçemedi.',
        },
        { status: 400 }
      );
    }

    // Dry-run handling
    if (isDryRun) {
      return NextResponse.json({
        success: true,
        ok: true,
        dryRun: true,
        inferenceExecuted: false,
        gpuHeavyLock,
        safeRuntime,
        message: 'Görsel üretim dry-run testi başarıyla tamamlandı.'
      });
    }

    const result = await imageGenerationService.createJob({
      projectId: 'default',
      sourceApp: 'aillame-ui',
      prompt: body.prompt,
      negativePrompt: body.negativePrompt,
      modelId: activeImageModelId,
    });

    if (!result.success) {
      return NextResponse.json({
        ok: false,
        success: false,
        jobCreated: false,
        inferenceExecuted: false,
        error: result.warning || 'Failed to queue job',
        errors: [result.warning || 'Failed to queue job'],
        gpuHeavyLock: getGpuHeavyLockStatus(),
        safeRuntime,
        message: 'Görsel üretim işi başlatılamadı.'
      }, { status: 400 });
    }
    
    // Add runtime diagnostics for validation
    const projectRoot = getProjectRoot();
    const rawCommand = process.env.AILLAME_IGM_WORKER_COMMAND;
    const resolvedPython = rawCommand ? resolveProjectRelative(rawCommand) : 'default';
    const workerScript = process.env.AILLAME_IGM_WORKER_ARGS || 'unknown';
    const workerScriptPath = resolveProjectRelative(workerScript);
    
    return NextResponse.json({
      ...result,
      success: true,
      jobId: result.jobId,
      status: 'queued',
      gpuHeavyLock: getGpuHeavyLockStatus(),
      safeRuntime,
      diagnostics: {
        projectRoot: path.basename(projectRoot),
        resolvedPython: path.isAbsolute(resolvedPython)
          ? '...' + path.sep + path.basename(path.dirname(resolvedPython)) + path.sep + path.basename(resolvedPython)
          : resolvedPython,
        workerScriptPath: path.basename(workerScriptPath),
        spawnCwd: path.basename(projectRoot),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Görsel üretimi başarısız oldu.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  const jobs = await imageJobStore.listJobs();
  const job = jobs.find((j: any) => j.jobId === jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ job });
}
