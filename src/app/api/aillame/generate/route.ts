import { NextRequest, NextResponse } from 'next/server';
import {
  assertExternalClientModeAccess,
  assertExternalClientProjectAccess,
  assertExternalClientTaskAccess,
  assertExternalClientToolAccess,
  validateExternalClientRequest,
} from '@core/external-auth/client-auth';
import { getDefaultModelForMode } from '@core/models/model-policy';
import { getAllModels } from '@core/models/registry';
import { generateWithTextRuntimeRouter } from '@core/inference/text-runtime-router';
import {
  buildPromptFromMessages,
  normalizeOpenAIChatMessages,
} from '@core/external-api/chat-normalizer';
import { jsonNativeApiError } from '@core/external-api/error-format';

type NativeGenerateBody = {
  projectId?: unknown;
  mode?: unknown;
  task?: unknown;
  context?: unknown;
  input?: unknown;
  messages?: unknown;
  model?: unknown;
};

type ParsedNativeGenerateBody = {
  projectId: string;
  mode: string;
  task: string;
  context?: Record<string, unknown>;
  input?: string;
  messages?: unknown;
  model?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNativeBody(payload: unknown):
  | { success: true; body: ParsedNativeGenerateBody }
  | { success: false; error: string } {
  if (!isRecord(payload)) {
    return { success: false, error: 'Body must be a JSON object.' };
  }

  const body = payload as NativeGenerateBody;

  if (typeof body.projectId !== 'string' || body.projectId.trim().length === 0) {
    return { success: false, error: 'projectId is required.' };
  }

  if (body.mode !== undefined && typeof body.mode !== 'string') {
    return { success: false, error: 'mode must be a string when provided.' };
  }

  if (body.task !== undefined && typeof body.task !== 'string') {
    return { success: false, error: 'task must be a string when provided.' };
  }

  if (body.input !== undefined && typeof body.input !== 'string') {
    return { success: false, error: 'input must be a string when provided.' };
  }

  if (body.model !== undefined && typeof body.model !== 'string') {
    return { success: false, error: 'model must be a string when provided.' };
  }

  if (body.context !== undefined && !isRecord(body.context)) {
    return { success: false, error: 'context must be an object when provided.' };
  }

  return {
    success: true,
    body: {
      projectId: body.projectId.trim(),
      mode: typeof body.mode === 'string' && body.mode.trim() ? body.mode.trim() : 'general',
      task: typeof body.task === 'string' && body.task.trim() ? body.task.trim() : 'generate_text',
      context: body.context as Record<string, unknown> | undefined,
      input: typeof body.input === 'string' ? body.input.trim() : undefined,
      messages: body.messages,
      model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  const authResult = await validateExternalClientRequest(request);
  if (!authResult.success || !authResult.client) {
    return jsonNativeApiError(authResult.error || 'Unauthorized external client request.', 'unauthorized', authResult.statusCode || 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonNativeApiError('Invalid JSON payload.', 'invalid_json', 400);
  }

  const parsed = parseNativeBody(payload);
  if (!parsed.success) {
    return jsonNativeApiError(parsed.error, 'invalid_request', 400);
  }

  const { projectId, mode, task, input, messages, model } = parsed.body;
  const client = authResult.client;

  if (!assertExternalClientProjectAccess(client, projectId)) {
    return jsonNativeApiError('Client is not authorized for the requested project.', 'project_forbidden', 403);
  }

  if (!assertExternalClientModeAccess(client, mode)) {
    return jsonNativeApiError('Client is not authorized for the requested mode.', 'mode_forbidden', 403);
  }

  if (!assertExternalClientTaskAccess(client, task)) {
    return jsonNativeApiError('Client is not authorized for the requested task.', 'task_forbidden', 403);
  }

  if (!assertExternalClientToolAccess(client, 'externalGenerate')) {
    return jsonNativeApiError('Client is not authorized to use this endpoint.', 'tool_forbidden', 403);
  }

  let prompt: string | undefined;
  let normalizedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> | undefined;

  if (messages !== undefined) {
    const normalized = normalizeOpenAIChatMessages(messages);
    if (!normalized.success) {
      return jsonNativeApiError(normalized.error, 'invalid_messages', 400);
    }

    normalizedMessages = normalized.messages;
    prompt = buildPromptFromMessages(normalized.messages);
  } else if (typeof input === 'string' && input.length > 0) {
    prompt = input;
  }

  if (!prompt) {
    return jsonNativeApiError('Either messages or input must be provided.', 'missing_prompt', 400);
  }

  const selectedModel = model || getDefaultModelForMode(mode);
  if (!selectedModel) {
    return jsonNativeApiError('No default model is configured.', 'model_not_configured', 500);
  }

  try {
    const generation = await generateWithTextRuntimeRouter({
      prompt,
      messages: normalizedMessages,
      modelId: selectedModel,
    });

    if (!generation.success || !generation.answer) {
      return jsonNativeApiError(generation.error || 'Text generation failed.', generation.code || 'generation_failed', 503);
    }

    const modelRuntime = getAllModels().find((item) => item.id === selectedModel)?.runtime || 'internal-text';
    const warnings = generation.usedFallback
      ? ['Primary provider unavailable; fallback provider used.']
      : [];

    return NextResponse.json(
      {
        success: true,
        provider: 'aillame',
        projectId,
        mode,
        task,
        model: {
          id: selectedModel,
          runtime: modelRuntime,
        },
        output: {
          text: generation.answer,
        },
        warnings,
      },
      { status: 200 },
    );
  } catch {
    return jsonNativeApiError('Internal server error.', 'internal_error', 500);
  }
}
