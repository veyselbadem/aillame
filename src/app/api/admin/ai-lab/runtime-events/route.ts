import { NextRequest, NextResponse } from 'next/server';
import { listRuntimeModelEvents } from '@/core/ai-lab/runtime-event-log';

export const runtime = 'nodejs';

function unauthorized(): NextResponse {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

function validateAdminToken(req: NextRequest): boolean {
  const authHeader = req.headers.get('x-aillame-admin-token');
  return authHeader === process.env.AILLAME_ADMIN_TOKEN;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!validateAdminToken(req)) return unauthorized();

  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100) : 20;
    const events = listRuntimeModelEvents(limit);
    return NextResponse.json({ success: true, data: { events, count: events.length } });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Runtime event log could not be read.' },
      { status: 500 },
    );
  }
}
