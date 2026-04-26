import { NextRequest, NextResponse } from 'next/server';
import { validateExternalClientRequest } from '@core/external-auth/client-auth';
import { generateProviderResponse } from '@core/provider/generate-service';
import type { ProviderGenerateRequest, ProviderGenerateResponse } from '@core/provider/types';

const ALLOWED_OUTPUT_FORMATS = ['text', 'structured', 'json'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createProviderErrorResponse(message: string, status = 400) {
  return NextResponse.json<ProviderGenerateResponse>(
    {
      success: false,
      provider: 'aillame',
      error: message,
    },
    { status },
  );
}

function validateRequestBody(body: unknown): body is ProviderGenerateRequest {
  if (!isRecord(body)) {
    return false;
  }

  const projectId = typeof body.projectId === 'string' && body.projectId.trim().length > 0;
  const task = typeof body.task === 'string' && body.task.trim().length > 0;
  const mode = body.mode === undefined || typeof body.mode === 'string';
  const language = body.language === undefined || typeof body.language === 'string';
  const input = body.input === undefined || typeof body.input === 'string';
  const context = body.context === undefined || isRecord(body.context);
  const outputFormat = body.outputFormat === undefined || ALLOWED_OUTPUT_FORMATS.includes(body.outputFormat as any);
  const metadata = body.metadata === undefined || isRecord(body.metadata);

  return Boolean(projectId && task && mode && language && input && context && outputFormat && metadata);
}

export async function POST(request: NextRequest) {
  const authResult = await validateExternalClientRequest(request);

  if (!authResult.success || !authResult.client) {
    return createProviderErrorResponse(authResult.error || 'Unauthorized external client request.', authResult.statusCode || 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createProviderErrorResponse('Invalid JSON payload.', 400);
  }

  if (!validateRequestBody(body)) {
    return createProviderErrorResponse('Invalid request body.', 400);
  }

  if (!authResult.client.projectId || body.projectId !== authResult.client.projectId) {
    return createProviderErrorResponse('Client is not authorized for the requested project.', 403);
  }

  if (body.mode && !authResult.client.allowedModes?.includes(body.mode)) {
    return createProviderErrorResponse('Client is not authorized for the requested mode.', 403);
  }

  if (!authResult.client.allowedTasks?.includes(body.task)) {
    return createProviderErrorResponse('Client is not authorized for the requested task.', 403);
  }

  if (!authResult.client.allowedTools?.includes('externalGenerate')) {
    return createProviderErrorResponse('Client is not authorized to use the external generate endpoint.', 403);
  }

  const response = await generateProviderResponse(body, authResult.client);

  if (!response.success) {
    const status = response.error.includes('Unauthorized') ? 403 : 400;
    return createProviderErrorResponse(response.error, status);
  }

  return NextResponse.json(response, { status: 200 });
}
