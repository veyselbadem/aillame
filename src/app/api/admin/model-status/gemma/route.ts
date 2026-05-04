import { NextRequest, NextResponse } from 'next/server';
import { getGemmaReadiness } from '@/core/model-management/status';
import { getTextRuntimeRouterStatus } from '@/core/inference/text-runtime-router';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-aillame-admin-token');
  if (token !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [report, internalTextRuntime] = await Promise.all([
      getGemmaReadiness(),
      getTextRuntimeRouterStatus(),
    ]);
    return NextResponse.json({ ...report, internalTextRuntime });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
