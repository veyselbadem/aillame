import { NextRequest, NextResponse } from 'next/server';
import { createAgentTask, listAgentTasks } from '@core/agent-tasks/service';
import { validateExternalClientRequest, createExternalAuthErrorResponse } from '@core/external-auth/client-auth';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';
import type { CreateAgentTaskInput } from '@core/agent-tasks/types';

async function validateRequest(req: NextRequest): Promise<true | NextResponse> {
  const externalAuth = await validateExternalClientRequest(req);
  if (externalAuth.success) {
    return true;
  }

  if (validateAdminRequest(req)) {
    return true;
  }

  return createExternalAuthErrorResponse(externalAuth.error || 'Unauthorized', externalAuth.statusCode ?? 401);
}

async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const authResult = await validateRequest(req);
  if (authResult !== true) {
    return authResult;
  }

  const payload = await parseJsonBody(req);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const projectId = typeof payload.projectId === 'string' ? payload.projectId.trim() : '';
  const mode = typeof payload.mode === 'string' ? payload.mode.trim() : '';
  const taskType = typeof payload.taskType === 'string' ? payload.taskType.trim() : '';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : undefined;
  const context = typeof payload.context === 'object' && payload.context !== null && !Array.isArray(payload.context) ? payload.context : undefined;
  const priority = typeof payload.priority === 'string' ? payload.priority.trim() as 'low' | 'normal' | 'high' : undefined;
  const maxRetries = typeof payload.maxRetries === 'number' ? payload.maxRetries : undefined;

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required.' }, { status: 400 });
  }

  if (!mode) {
    return NextResponse.json({ success: false, error: 'mode is required.' }, { status: 400 });
  }

  if (!taskType) {
    return NextResponse.json({ success: false, error: 'taskType is required.' }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ success: false, error: 'title is required.' }, { status: 400 });
  }

  if (payload.context !== undefined && (typeof payload.context !== 'object' || Array.isArray(payload.context))) {
    return NextResponse.json({ success: false, error: 'context must be an object.' }, { status: 400 });
  }

  if (maxRetries !== undefined && (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10)) {
    return NextResponse.json({ success: false, error: 'maxRetries must be an integer between 0 and 10.' }, { status: 400 });
  }

  try {
    const task = await createAgentTask({
      projectId,
      mode: mode as any,
      taskType,
      title,
      description,
      context,
      priority,
      maxRetries,
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create task.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authResult = await validateRequest(req);
  if (authResult !== true) {
    return authResult;
  }

  const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;
  const mode = req.nextUrl.searchParams.get('mode') ?? undefined;
  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const taskType = req.nextUrl.searchParams.get('taskType') ?? undefined;

  try {
    const tasks = await listAgentTasks({ projectId, mode, status: status as any, taskType });
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to list tasks.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
