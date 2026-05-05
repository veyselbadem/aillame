import { NextRequest, NextResponse } from 'next/server';
import { OllamaProviderError } from '@/core/inference/ollama';
import { generateWithTextRuntimeRouter } from '@/core/inference/text-runtime-router';
import { ensureSafeModelId, getRequestedModelIdFromPayload } from '@/core/inference/model-selection';
import { checkOllamaModelAvailability } from '@/core/inference/ollama-availability';
import { appendRuntimeModelEvent } from '@/core/ai-lab/runtime-event-log';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt : '';
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const temperature = typeof body?.temperature === 'number' ? body.temperature : undefined;
    const maxTokens = typeof body?.maxTokens === 'number' ? body.maxTokens : undefined;
    const requestedModelId = getRequestedModelIdFromPayload(body);
    const sanitizedRequestedModelId = ensureSafeModelId(requestedModelId);
    let modelId = sanitizedRequestedModelId
      || ensureSafeModelId(process.env.AILLAME_OLLAMA_TEXT_MODEL)
      || 'gemma:2b';

    if (process.env.AILLAME_OLLAMA_ENABLED === 'false') {
      return NextResponse.json(
        { success: false, provider: 'ollama', error: 'Ollama provider is disabled.', code: 'disabled' },
        { status: 403 }
      );
    }

    // Opsiyonel preflight: sadece requestBody'de belirli bir model isteniyorsa kontrol et
    let preflightWarning: string | undefined;
    if (sanitizedRequestedModelId) {
      try {
        const preflight = await checkOllamaModelAvailability(sanitizedRequestedModelId, { timeoutMs: 3000 });
        if (!preflight.available) {
          preflightWarning = `Requested model "${sanitizedRequestedModelId}" not found in Ollama. Using default fallback.`;
          appendRuntimeModelEvent({
            type: 'preflight',
            provider: 'ollama',
            requestedModelId: sanitizedRequestedModelId,
            ok: false,
            reason: preflight.reason ?? 'Model not available in Ollama.',
            source: 'ollama-chat-route',
          });
          // Fallback to env default — mevcut akış bozulmasın
          modelId = ensureSafeModelId(process.env.AILLAME_OLLAMA_TEXT_MODEL) || 'gemma:2b';
        } else {
          appendRuntimeModelEvent({
            type: 'preflight',
            provider: 'ollama',
            requestedModelId: sanitizedRequestedModelId,
            selectedModelId: sanitizedRequestedModelId,
            ok: true,
            reason: 'Model is available in Ollama.',
            source: 'ollama-chat-route',
          });
        }
      } catch {
        // Preflight hatası chat'i kırmamalı; sessizce devam et
      }
    }

    const runtimeResult = await generateWithTextRuntimeRouter({
      prompt,
      messages,
      temperature,
      maxTokens,
      modelId,
      preferredProvider: 'ollama',
      timeout: process.env.AILLAME_OLLAMA_TIMEOUT_MS
        ? parseInt(process.env.AILLAME_OLLAMA_TIMEOUT_MS)
        : 60000,
    });

    if (!runtimeResult.success) {
      return NextResponse.json(
        {
          success: false,
          provider: 'ollama',
          error: runtimeResult.error || 'Ollama runtime failed.',
          code: runtimeResult.code || 'runtime_error',
          modelId,
        },
        { status: runtimeResult.code === 'disabled' ? 403 : runtimeResult.code === 'timeout' ? 504 : 500 }
      );
    }

    const response = runtimeResult.answer || '';

    return NextResponse.json({
      success: true,
      provider: 'ollama',
      model: modelId,
      answer: response,
      response,
      ...(preflightWarning ? { preflightWarning } : {}),
    });
  } catch (error: any) {
    if (error instanceof OllamaProviderError) {
      return NextResponse.json(
        {
          success: false,
          provider: 'ollama',
          error: error.message,
          code: error.code,
          modelId: error.modelId,
          availableModels: error.availableModels,
        },
        { status: error.statusCode === 404 ? 404 : error.statusCode || 503 }
      );
    }

    return NextResponse.json(
      { success: false, provider: 'ollama', error: error.message || 'Internal Server Error', code: 'unknown_error' },
      { status: 500 }
    );
  }
}
