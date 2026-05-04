import { NextRequest, NextResponse } from 'next/server';
import { generateOllamaResponse, OllamaProviderError } from '@/core/inference/ollama';
import { generateWithTextRuntimeRouter } from '@/core/inference/text-runtime-router';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, temperature, maxTokens, model } = await req.json();

    if (process.env.AILLAME_OLLAMA_ENABLED === 'false') {
      return NextResponse.json(
        { success: false, provider: 'ollama', error: 'Ollama provider is disabled.', code: 'disabled' },
        { status: 403 }
      );
    }

    const modelId = model || process.env.AILLAME_OLLAMA_TEXT_MODEL || 'gemma:2b';

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

    return NextResponse.json({ success: true, provider: 'ollama', model: modelId, answer: response, response });
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
