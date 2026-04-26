import { NextRequest, NextResponse } from 'next/server';
import {
  validateExternalClientRequest,
  assertExternalClientProjectAccess,
  assertExternalClientModeAccess,
  assertExternalClientTaskAccess,
  assertExternalClientToolAccess,
} from '@core/external-auth/client-auth';
import { generateProviderResponse } from '@core/provider/generate-service';
import type { ProviderGenerateRequest } from '@core/provider/types';
import type { ExternalApiMode } from '@core/external-api/types';

const SUPPORTED_COMPATIBILITY_TASKS = ['generate_news_draft', 'suggest_game_embeds'] as const;

type CompatibilityTask = (typeof SUPPORTED_COMPATIBILITY_TASKS)[number];

type ExternalCompatibilityRequest = {
  projectId?: string;
  task?: string;
  mode?: string;
  language?: string;
  context?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSupportedCompatibilityTask(task: string | undefined): task is CompatibilityTask {
  return SUPPORTED_COMPATIBILITY_TASKS.includes(task as CompatibilityTask);
}

function createCompatibilityError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      provider: 'aillame',
      error: message,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const authResult = await validateExternalClientRequest(request);
  if (!authResult.success || !authResult.client) {
    return createCompatibilityError(authResult.error || 'Unauthorized external client request.', authResult.statusCode || 401);
  }

  const client = authResult.client;
  if (!assertExternalClientToolAccess(client, 'externalGenerate')) {
    return createCompatibilityError('Client is not authorized to use the external generate endpoint.', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createCompatibilityError('Invalid JSON payload.', 400);
  }

  if (!isRecord(body)) {
    return createCompatibilityError('Invalid request body.', 400);
  }

  const projectId = typeof body.projectId === 'string' && body.projectId.trim() ? body.projectId.trim() : undefined;
  const task = typeof body.task === 'string' && body.task.trim() ? body.task.trim() : undefined;
  const mode = body.mode === undefined || typeof body.mode === 'string' ? (body.mode as ExternalApiMode | undefined) : null;
  const language = body.language === undefined || typeof body.language === 'string' ? (body.language as string | undefined) : null;
  const context = isRecord(body.context) ? body.context : undefined;

  if (!projectId) {
    return createCompatibilityError('Missing projectId.', 400);
  }

  if (!task) {
    return createCompatibilityError('Missing task.', 400);
  }

  if (!isSupportedCompatibilityTask(task)) {
    return createCompatibilityError('Unsupported compatibility task.', 400);
  }

  if (context === undefined) {
    return createCompatibilityError('Missing context.', 400);
  }

  if (mode === null) {
    return createCompatibilityError('Invalid mode.', 400);
  }

  if (language === null) {
    return createCompatibilityError('Invalid language.', 400);
  }

  if (!assertExternalClientProjectAccess(client, projectId)) {
    return createCompatibilityError('Client is not authorized for the requested project.', 403);
  }

  if (mode && !assertExternalClientModeAccess(client, mode)) {
    return createCompatibilityError('Client is not authorized for the requested mode.', 403);
  }

  if (!assertExternalClientTaskAccess(client, task)) {
    return createCompatibilityError('Client is not authorized for the requested task.', 403);
  }

  const requestPayload: ProviderGenerateRequest = {
    projectId,
    task,
    mode: mode ?? 'general',
    language: language ?? 'tr',
    context,
  };

  const providerResponse = await generateProviderResponse(requestPayload, client);
  if (!providerResponse.success) {
    const status = providerResponse.error.includes('Unauthorized') ? 403 : 400;
    return createCompatibilityError(providerResponse.error, status);
  }

  if (task === 'generate_news_draft') {
    const output = providerResponse.output as {
      title: string;
      content: string;
      category: string;
      tags: string[];
      summary: string;
      metaTitle: string;
      metaDescription: string;
    };

    return NextResponse.json(
      {
        success: true,
        provider: 'aillame',
        output: {
          title: output.title,
          content: output.content,
          category: output.category,
          tags: output.tags,
          summary: output.summary,
          metaTitle: output.metaTitle,
          metaDescription: output.metaDescription,
        },
      },
      { status: 200 },
    );
  }

  if (task === 'suggest_game_embeds') {
    const rawOutput = providerResponse.output as Array<{
      title: string;
      description: string;
      category: string;
      embedUrl: string;
      tags: string[];
    }>;

    const output = rawOutput.map((item) => ({
      title: item.title,
      description: item.description,
      category: item.category,
      embedUrl: item.embedUrl,
      tags: item.tags,
    }));

    return NextResponse.json(
      {
        success: true,
        provider: 'aillame',
        output,
      },
      { status: 200 },
    );
  }

  return createCompatibilityError('Unsupported compatibility task.', 400);
}
