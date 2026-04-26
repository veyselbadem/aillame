import { NextRequest, NextResponse } from 'next/server';
import { getApiClientById, updateApiClient } from '@core/api-clients/service';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';
import type { UpdateApiClientInput } from '@core/api-clients/types';

async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function sanitizeClient(client: any) {
  const { apiKeyHash, ...safeClient } = client;
  return safeClient;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  const { clientId } = await params;
  try {
    const client = await getApiClientById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, client: sanitizeClient(client) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch API client.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  const { clientId } = await params;
  const payload = await parseJsonBody(req);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const updates: UpdateApiClientInput = {};
  if (typeof payload.displayName === 'string') updates.displayName = payload.displayName;
  if (typeof payload.description === 'string') updates.description = payload.description;
  if (typeof payload.status === 'string') updates.status = payload.status as any;
  if (Array.isArray(payload.allowedModes)) updates.allowedModes = payload.allowedModes.filter((item: any) => typeof item === 'string');
  if (Array.isArray(payload.allowedTasks)) updates.allowedTasks = payload.allowedTasks.filter((item: any) => typeof item === 'string');
  if (Array.isArray(payload.allowedTools)) updates.allowedTools = payload.allowedTools.filter((item: any) => typeof item === 'string');
  if (typeof payload.rateLimitProfile === 'string') updates.rateLimitProfile = payload.rateLimitProfile as any;
  if (typeof payload.notes === 'string') updates.notes = payload.notes;
  if (typeof payload.memoryPolicy === 'object' && payload.memoryPolicy !== null && !Array.isArray(payload.memoryPolicy)) {
    updates.memoryPolicy = {
      allowGlobalRead: typeof payload.memoryPolicy.allowGlobalRead === 'boolean' ? payload.memoryPolicy.allowGlobalRead : undefined,
      allowGlobalWrite: typeof payload.memoryPolicy.allowGlobalWrite === 'boolean' ? payload.memoryPolicy.allowGlobalWrite : undefined,
      allowProjectMemory: typeof payload.memoryPolicy.allowProjectMemory === 'boolean' ? payload.memoryPolicy.allowProjectMemory : undefined,
      allowClientMemory: typeof payload.memoryPolicy.allowClientMemory === 'boolean' ? payload.memoryPolicy.allowClientMemory : undefined,
      allowSessionMemory: typeof payload.memoryPolicy.allowSessionMemory === 'boolean' ? payload.memoryPolicy.allowSessionMemory : undefined,
      allowTaskMemory: typeof payload.memoryPolicy.allowTaskMemory === 'boolean' ? payload.memoryPolicy.allowTaskMemory : undefined,
      allowMemoryWriteQueueOnly: typeof payload.memoryPolicy.allowMemoryWriteQueueOnly === 'boolean' ? payload.memoryPolicy.allowMemoryWriteQueueOnly : undefined,
    };
  }

  try {
    const client = await updateApiClient(clientId, updates);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, client: sanitizeClient(client) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update API client.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
