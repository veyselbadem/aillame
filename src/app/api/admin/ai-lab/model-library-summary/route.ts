import { NextRequest, NextResponse } from 'next/server';
import { getAiLabModelLibrarySummary } from '@core/ai-lab/service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = getAiLabModelLibrarySummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model library summary failed.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
