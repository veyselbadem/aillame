import { NextRequest, NextResponse } from 'next/server';
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
    
    return NextResponse.json({
      ...result,
      diagnostics: {
        projectRoot,
        resolvedPython,
        spawnCwd: projectRoot,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Görsel üretimi başarısız oldu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
