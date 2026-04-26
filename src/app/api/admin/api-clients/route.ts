import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, listApiClients } from '@core/api-clients/service';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';
import type { CreateApiClientInput } from '@core/api-clients/types';

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

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  try {
    const clients = await listApiClients();
    return NextResponse.json({ success: true, clients: clients.map(sanitizeClient) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to list API clients.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  const payload = await parseJsonBody(req);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const body = payload as CreateApiClientInput;
  if (!body.projectId || !body.displayName || !body.ownerType || !Array.isArray(body.allowedModes)) {
    return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
  }

  try {
    const result = await createApiClient({
      projectId: body.projectId,
      displayName: body.displayName,
      description: body.description,
      ownerType: body.ownerType,
      allowedModes: body.allowedModes,
      allowedTasks: body.allowedTasks ?? [],
      allowedTools: body.allowedTools ?? [],
      rateLimitProfile: body.rateLimitProfile,
      memoryPolicy: body.memoryPolicy,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, client: sanitizeClient(result.client), rawApiKey: result.rawApiKey });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create API client.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
