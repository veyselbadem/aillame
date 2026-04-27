import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSessionStatus, addMessageToSession, executeNextStep, runControlledLoop, deleteSession } from '@/core/ai-lab/service';

/**
 * Admin AI Lab Single Session API
 * GET: Get session details
 * PATCH: Update status (start, pause, resume, stop)
 * POST: Add a message OR execute next step
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status } = await req.json();
    await updateSessionStatus(sessionId, status);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    if (body.action === 'step') {
      const msg = await executeNextStep(sessionId);
      return NextResponse.json(msg);
    }

    if (body.action === 'run_controlled') {
      const msgs = await runControlledLoop(sessionId, body.steps || 3);
      return NextResponse.json(msgs);
    }

    const { model, content } = body;
    const msg = await addMessageToSession(sessionId, model, content);
    return NextResponse.json(msg);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const success = await deleteSession(sessionId);
    if (!success) {
      return NextResponse.json({ error: 'Session not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deletedSessionId: sessionId });
  } catch (error) {
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
