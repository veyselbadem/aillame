import { NextRequest, NextResponse } from 'next/server';
import { removeLocalModel } from '@core/model-library';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await removeLocalModel({
      modelId: typeof body?.modelId === 'string' ? body.modelId : '',
      dryRun: body?.dryRun !== false,
      confirmDelete: body?.confirmDelete === true,
    });

    const statusCode = result.ok ? 200 : 400;
    return NextResponse.json({ success: result.ok, data: result, error: result.ok ? undefined : result.message }, { status: statusCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model remove işlemi başarısız.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
