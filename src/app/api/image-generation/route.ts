import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { imageGenerationService } from '@/core/runtime/image/image-generation-service';
import { imageJobStore } from '@/core/runtime/image/jobs/image-job-file-store';
import { getProjectRoot, resolveProjectRelative } from '@core/project-root';
import { getActiveImageModelId } from '@core/model-management/active-model-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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

    const result = await imageGenerationService.createJob({
      projectId: 'default',
      sourceApp: 'aillame-ui',
      prompt: body.prompt,
      negativePrompt: body.negativePrompt,
      modelId: activeImageModelId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.warning || 'Failed to queue job' }, { status: 400 });
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
