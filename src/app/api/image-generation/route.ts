import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { generateImageWithSdxl } from '@core/image-generation/sdxl';
import { getProjectRoot, resolveProjectRelative } from '@core/project-root';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateImageWithSdxl(body);
    
    // Add runtime diagnostics for validation
    const projectRoot = getProjectRoot();
    const rawCommand = process.env.AILLAME_IGM_WORKER_COMMAND;
    const resolvedPython = rawCommand ? resolveProjectRelative(rawCommand) : 'default';
    const workerScript = process.env.AILLAME_IGM_WORKER_ARGS || 'unknown';
    const workerScriptPath = resolveProjectRelative(workerScript);
    
    return NextResponse.json({
      ...result,
      diagnostics: {
        projectRoot: path.basename(projectRoot),
        resolvedPython: path.isAbsolute(resolvedPython) ? `...${path.sep}${path.basename(path.dirname(resolvedPython))}${path.sep}${path.basename(resolvedPython)}` : resolvedPython,
        workerScriptPath: path.basename(workerScriptPath),
        spawnCwd: path.basename(projectRoot),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Görsel üretimi başarısız oldu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
