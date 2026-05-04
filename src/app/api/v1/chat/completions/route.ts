import { NextRequest, NextResponse } from 'next/server';
import { validateExternalClientRequest } from '@core/external-auth/client-auth';
import { getDefaultModelForMode } from '@core/models/model-policy';
import { getEnabledModels } from '@core/models/registry';
import { generateWithTextRuntimeRouter } from '@core/inference/text-runtime-router';
import {
  buildPromptFromMessages,
  normalizeOpenAIChatMessages,
} from '@core/external-api/chat-normalizer';
import { toOpenAIChatCompletion } from '@core/external-api/openai-mapper';
import { jsonOpenAIError } from '@core/external-api/error-format';
import type { ManagedModel } from '@core/models/types';

type ChatCompletionsBody = {
  model?: unknown;
  messages?: unknown;
  temperature?: unknown;
  max_tokens?: unknown;
  stream?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChatBody(payload: unknown):
  | {
      success: true;
      body: {
        model?: string;
        messages: unknown;
        temperature?: number;
        maxTokens?: number;
        stream: boolean;
      };
    }
  | { success: false; error: string } {
  if (!isRecord(payload)) {
    return { success: false, error: 'Body must be a JSON object.' };
  }

  const body = payload as ChatCompletionsBody;

  if (body.messages === undefined) {
    return { success: false, error: 'messages is required.' };
  }

  if (body.model !== undefined && typeof body.model !== 'string') {
    return { success: false, error: 'model must be a string when provided.' };
  }

  if (body.temperature !== undefined && typeof body.temperature !== 'number') {
    return { success: false, error: 'temperature must be a number when provided.' };
  }

  if (body.max_tokens !== undefined && (typeof body.max_tokens !== 'number' || !Number.isFinite(body.max_tokens))) {
    return { success: false, error: 'max_tokens must be a finite number when provided.' };
  }

  if (body.stream !== undefined && typeof body.stream !== 'boolean') {
    return { success: false, error: 'stream must be a boolean when provided.' };
  }

  return {
    success: true,
    body: {
      model: typeof body.model === 'string' ? body.model.trim() : undefined,
      messages: body.messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
      maxTokens: typeof body.max_tokens === 'number' ? Math.max(1, Math.floor(body.max_tokens)) : undefined,
      stream: body.stream === true,
    },
  };
}

function isChatCompatibleModel(model: ManagedModel): boolean {
  return model.enabled !== false
    && model.purpose === 'chat'
    && (model.type === undefined || model.type === 'text' || model.type === 'multimodal')
    && model.capabilities.includes('chat');
}

export async function POST(request: NextRequest) {
  const authResult = await validateExternalClientRequest(request);
  if (!authResult.success || !authResult.client) {
    return jsonOpenAIError(authResult.error || 'Unauthorized external client request.', 'unauthorized', authResult.statusCode || 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonOpenAIError('Invalid JSON payload.', 'invalid_json', 400);
  }

  const parsed = parseChatBody(payload);
  if (!parsed.success) {
    return jsonOpenAIError(parsed.error, 'invalid_request', 400);
  }

  if (parsed.body.stream) {
    return jsonOpenAIError('Streaming is not supported in FAZ 3.', 'stream_not_supported', 501);
  }

  const normalized = normalizeOpenAIChatMessages(parsed.body.messages);
  if (!normalized.success) {
    return jsonOpenAIError(normalized.error, 'invalid_messages', 400);
  }

  const chatModels = getEnabledModels().filter((model) => isChatCompatibleModel(model));
  const selectedModel = parsed.body.model || getDefaultModelForMode('general');

  if (!selectedModel) {
    return jsonOpenAIError('No default model is configured.', 'model_not_configured', 500);
  }

  if (!chatModels.some((model) => model.id === selectedModel)) {
    return jsonOpenAIError('Requested model is not available for chat.', 'model_unavailable', 400);
  }

  const prompt = buildPromptFromMessages(normalized.messages);

  try {
    const generation = await generateWithTextRuntimeRouter({
      prompt,
      messages: normalized.messages,
      maxTokens: parsed.body.maxTokens,
      temperature: parsed.body.temperature,
      modelId: selectedModel,
    });

    if (!generation.success || !generation.answer) {
      return jsonOpenAIError(generation.error || 'Text generation failed.', generation.code || 'generation_failed', 503);
    }

    const warnings = generation.usedFallback
      ? ['Primary provider unavailable; fallback provider used.']
      : undefined;

    return NextResponse.json(
      toOpenAIChatCompletion({
        model: selectedModel,
        content: generation.answer,
        warnings,
      }),
      { status: 200 },
    );
  } catch {
    return jsonOpenAIError('Internal server error.', 'internal_error', 500);
  }
}
