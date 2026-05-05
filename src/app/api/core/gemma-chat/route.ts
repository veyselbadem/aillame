import { NextRequest, NextResponse } from 'next/server';
import { GemmaProviderError, generateGemmaResponse, isGemmaFallbackResponse } from '@/core/inference/gemma';
import { generateWithTextRuntimeRouter } from '@/core/inference/text-runtime-router';
import { ensureSafeModelId, getRequestedModelIdFromPayload } from '@/core/inference/model-selection';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt : undefined;
    const message = typeof body?.message === 'string' ? body.message : undefined;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const temperature = typeof body?.temperature === 'number' ? body.temperature : undefined;
    const maxTokens = typeof body?.maxTokens === 'number' ? body.maxTokens : undefined;
    const resolvedPrompt = (prompt || message || '').trim();
    if (!resolvedPrompt) {
      return NextResponse.json({ success: false, provider: 'gemma', error: 'empty_prompt', code: 'gemma_no_input' }, { status: 400 });
    }

    if (process.env.AILLAME_GEMMA_ENABLED !== 'true') {
      return NextResponse.json({
        success: false,
        provider: 'gemma',
        code: 'disabled',
        error: 'Gemma provider devre dışı.',
        hint: 'AILLAME_GEMMA_ENABLED=true yapın ve llama-server çalıştırın.',
      }, { status: 403 });
    }

    const activeModelId = process.env.AILLAME_GEMMA_MODEL_ID || process.env.AILLAME_GEMMA_GGUF_FILE || 'gemma-4-E4B-it-Q4_K_M.gguf';
    const requestedModelId = ensureSafeModelId(getRequestedModelIdFromPayload(body));
    const modelSelection = {
      requestedModelId: requestedModelId || null,
      activeModelId,
      applied: !requestedModelId || requestedModelId === activeModelId,
      reason: requestedModelId && requestedModelId !== activeModelId
        ? 'Gemma runtime this phase is static; requested model is tracked as metadata only.'
        : 'Gemma request is aligned with static runtime model.',
    };

    const runtimeResult = await generateWithTextRuntimeRouter({
      prompt: resolvedPrompt,
      messages,
      temperature,
      maxTokens,
      timeout: process.env.AILLAME_GEMMA_TIMEOUT_MS
        ? parseInt(process.env.AILLAME_GEMMA_TIMEOUT_MS)
        : 60000,
      preferredProvider: 'gemma',
      modelId: activeModelId,
    });

    if (!runtimeResult.success) {
      return NextResponse.json(
        {
          success: false,
          provider: 'gemma',
          code: runtimeResult.code || 'runtime_error',
          error: runtimeResult.error || 'Gemma runtime failed.',
          hint: runtimeResult.hint,
          modelSelection,
        },
        { status: runtimeResult.code === 'disabled' ? 403 : runtimeResult.code === 'timeout' ? 504 : 500 }
      );
    }

    const response = runtimeResult.answer || '';

    if (isGemmaFallbackResponse(response)) {
      return NextResponse.json({
        success: false,
        provider: 'gemma',
        code: 'reasoning_only',
        error: response,
        answer: response,
        response,
        model: activeModelId,
        modelSelection,
        isFallback: true,
      }, { status: 200 });
    }

    return NextResponse.json({ success: true, provider: 'gemma', answer: response, response, model: activeModelId, modelSelection });
  } catch (error: any) {
    console.error('[Gemma API Error]:', error);
    if (error instanceof GemmaProviderError) {
      return NextResponse.json(
        {
          success: false,
          provider: 'gemma',
          code: error.code,
          error: error.message,
          hint: error.hint,
          modelSelection: {
            requestedModelId: null,
            activeModelId: process.env.AILLAME_GEMMA_MODEL_ID || process.env.AILLAME_GEMMA_GGUF_FILE || 'gemma-4-E4B-it-Q4_K_M.gguf',
            applied: true,
            reason: 'Gemma runtime exception fallback metadata.',
          },
        },
        { status: error.statusCode || (error.code === 'server_offline' || error.code === 'runtime_start_failed' ? 503 : error.code === 'timeout' ? 504 : 500) }
      );
    }

    return NextResponse.json(
      {
        success: false,
        provider: 'gemma',
        code: 'unknown_error',
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
