import { NextRequest, NextResponse } from 'next/server';
import { getOllamaReadiness } from '@/core/model-management/status';
import { getTextRuntimeRouterStatus } from '@/core/inference/text-runtime-router';
import { LOCAL_FIRST_DISABLED_MESSAGE, isLegacyProvidersEnabled } from '@/core/feature-flags/legacy-providers';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-aillame-admin-token');
  if (token !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isLegacyProvidersEnabled()) {
    return NextResponse.json(
      { success: false, provider: 'ollama', error: LOCAL_FIRST_DISABLED_MESSAGE, code: 'disabled_by_policy' },
      { status: 410 }
    );
  }

  try {
    const [report, internalTextRuntime] = await Promise.all([
      getOllamaReadiness(),
      getTextRuntimeRouterStatus(),
    ]);
    return NextResponse.json({ ...report, internalTextRuntime });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
