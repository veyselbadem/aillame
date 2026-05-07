import { NextRequest, NextResponse } from 'next/server';
import type { AillameMode } from '@core/aillame-router/types';
import type { AillameTaskType } from '@core/contracts/aillame-request';
import { validateExternalApiRequest, createExternalApiResponseHeaders } from '@core/external-api/auth';
import { jsonOpenAIError } from '@core/external-api/error-format';
import { generateWithBestTextRuntime } from '@core/runtime/text/text-runtime-router';

type OpenAIChatRole = 'system' | 'user' | 'assistant' | 'tool';

type OpenAIChatMessage = {
  role: OpenAIChatRole;
  content: string;
  name?: string;
};

type ParsedChatBody = {
  model?: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  projectId?: string;
  mode?: AillameMode;
  taskType?: AillameTaskType;
};

type ChatCompletionsBody = {
  model?: unknown;
  messages?: unknown;
  temperature?: unknown;
  max_tokens?: unknown;
  stream?: unknown;
  projectId?: unknown;
  mode?: unknown;
  taskType?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeMode(value: unknown): AillameMode | undefined {
  if (value === 'general' || value === 'education' || value === 'code' || value === 'economy') return value;
  return undefined;
}

function normalizeTaskType(value: unknown): AillameTaskType | undefined {
  if (
    value === 'chat'
    || value === 'text'
    || value === 'code'
    || value === 'analysis'
    || value === 'image'
    || value === 'vision'
    || value === 'agent'
    || value === 'mixed'
    || value === 'unknown'
  ) {
    return value;
  }
  return undefined;
}

function normalizeMessages(value: unknown): { success: true; messages: OpenAIChatMessage[] } | { success: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { success: false, error: 'messages must be a non-empty array.' };
  }

  const messages: OpenAIChatMessage[] = [];
  for (const [index, message] of value.entries()) {
    if (!isRecord(message)) {
      return { success: false, error: `messages[${index}] must be an object.` };
    }

    const role = message.role;
    if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool') {
      return { success: false, error: `messages[${index}].role is invalid.` };
    }

    if (typeof message.content !== 'string' || !message.content.trim()) {
      return { success: false, error: `messages[${index}].content must be a non-empty string.` };
    }

    messages.push({
      role,
      content: message.content,
      name: optionalString(message.name),
    });
  }

  return { success: true, messages };
}

function parseChatBody(payload: unknown): { success: true; body: ParsedChatBody } | { success: false; error: string } {
  if (!isRecord(payload)) {
    return { success: false, error: 'Body must be a JSON object.' };
  }

  const body = payload as ChatCompletionsBody;
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

  const normalizedMessages = normalizeMessages(body.messages);
  if (!normalizedMessages.success) {
    return { success: false, error: normalizedMessages.error };
  }

  return {
    success: true,
    body: {
      model: optionalString(body.model),
      messages: normalizedMessages.messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
      maxTokens: typeof body.max_tokens === 'number' ? Math.max(1, Math.floor(body.max_tokens)) : undefined,
      stream: body.stream === true,
      projectId: optionalString(body.projectId),
      mode: normalizeMode(body.mode),
      taskType: normalizeTaskType(body.taskType) ?? 'chat',
    },
  };
}

function buildPrompt(messages: OpenAIChatMessage[]): string {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n')
    .trim();
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function openAIChatCompletion(input: {
  model: string;
  content: string;
  finishReason: string;
  warnings?: string[];
}) {
  return {
    id: `chatcmpl-aillame-${Date.now().toString(36)}`,
    object: 'chat.completion',
    created: nowSeconds(),
    model: input.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: input.content,
        },
        finish_reason: input.finishReason,
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
    aillame: {
      local: true,
      warnings: input.warnings ?? [],
    },
  };
}

export async function POST(request: NextRequest) {
  const authResult = await validateExternalApiRequest(request);
  if (!authResult.success || !authResult.client) {
    return jsonOpenAIError(
      authResult.error || 'Unauthorized external client request.',
      'unauthorized',
      authResult.statusCode || 401,
      createExternalApiResponseHeaders(authResult),
    );
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

  const responseHeaders = createExternalApiResponseHeaders(authResult);

  if (parsed.body.stream) {
    return jsonOpenAIError(
      'Streaming is not supported by Aillame local OpenAI-compatible chat completions yet.',
      'stream_not_supported',
      501,
      responseHeaders,
    );
  }

  const prompt = buildPrompt(parsed.body.messages);
  if (!prompt) {
    return jsonOpenAIError('At least one non-system message is required.', 'invalid_messages', 400, responseHeaders);
  }

  try {
    const runtimeResult = await generateWithBestTextRuntime({
      modelId: parsed.body.model,
      projectId: parsed.body.projectId,
      mode: parsed.body.mode,
      taskType: parsed.body.taskType,
      prompt,
      messages: parsed.body.messages,
      maxTokens: parsed.body.maxTokens,
      temperature: parsed.body.temperature,
      stream: false,
      metadata: {
        source: 'openai-compatible-chat-completions',
      },
    });

    const generation = runtimeResult.generation;
    if (!generation.success && generation.finishReason !== 'unsupported') {
      return jsonOpenAIError(
        generation.error?.message || 'Aillame local text runtime failed.',
        generation.error?.code || 'generation_failed',
        503,
        responseHeaders,
      );
    }

    return NextResponse.json(
      openAIChatCompletion({
        model: generation.modelId,
        content: generation.content,
        finishReason: generation.finishReason === 'length' ? 'length' : 'stop',
        warnings: [...runtimeResult.route.warnings, ...generation.warnings],
      }),
      { status: generation.success ? 200 : 503, headers: responseHeaders },
    );
  } catch {
    return jsonOpenAIError('Internal server error.', 'internal_error', 500, responseHeaders);
  }
}
