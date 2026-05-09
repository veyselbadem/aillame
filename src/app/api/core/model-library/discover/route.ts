import { NextRequest, NextResponse } from 'next/server';
import { refreshLocalModelLibrary } from '@core/model-library';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const directories = Array.isArray(body?.directories)
      ? body.directories.filter((item: unknown) => typeof item === 'string')
      : undefined;
    const maxDepth = Number.isFinite(body?.maxDepth) ? Number(body.maxDepth) : undefined;

    const snapshot = await refreshLocalModelLibrary({ directories, maxDepth });
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model discovery başarısız.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
