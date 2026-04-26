import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/core/ai-lab/service';
import { loadSessions } from '@/core/ai-lab/store-json';

/**
 * Admin AI Lab Sessions API
 * Requires AILLAME_ADMIN_TOKEN
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await loadSessions();
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const session = await createSession(body);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 400 });
  }
}
