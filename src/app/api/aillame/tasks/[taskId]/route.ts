import { NextRequest, NextResponse } from 'next/server';
import { getAgentTask, listAgentTaskSteps, listAgentExecutionLogs, updateAgentTaskStatus } from '@core/agent-tasks/service';
import { validateExternalClientRequest, createExternalAuthErrorResponse } from '@core/external-auth/client-auth';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';
import type { UpdateAgentTaskStatusInput } from '@core/agent-tasks/types';

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const authResult = await validateRequest(req);
  if (authResult !== true) {
    return authResult;
  }

  const { taskId } = await params;
  const task = await getAgentTask(taskId);
  if (!task) {
    return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
  }

  const steps = await listAgentTaskSteps(taskId);
  const logs = await listAgentExecutionLogs(taskId);
  return NextResponse.json({ success: true, task, steps, logs });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const authResult = await validateRequest(req);
  if (authResult !== true) {
    return authResult;
  }

  const { taskId } = await params;
  const payload = await parseJsonBody(req);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const status = typeof payload.status === 'string' ? payload.status.trim() as UpdateAgentTaskStatusInput['status'] : undefined;
  const failedReason = typeof payload.failedReason === 'string' ? payload.failedReason.trim() : undefined;

  if (!status) {
    return NextResponse.json({ success: false, error: 'status is required.' }, { status: 400 });
  }

  const validStatuses: UpdateAgentTaskStatusInput['status'][] = [
    'pending',
    'planning',
    'running',
    'waiting_for_tool',
    'testing',
    'reviewing',
    'fixing',
    'waiting_for_user',
    'completed',
    'failed',
    'cancelled',
  ];

  if (!validStatuses.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 });
  }

  const updated = await updateAgentTaskStatus(taskId, { status, failedReason });
  if (!updated) {
    return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, task: updated });
}
