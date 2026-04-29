import { NextRequest, NextResponse } from 'next/server';
import { generateOllamaResponse, OllamaProviderError } from '@/core/inference/ollama';

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

    const response = await generateOllamaResponse({
      prompt,
      messages,
      temperature,
      maxTokens,
      model: modelId,
      timeout: process.env.AILLAME_OLLAMA_TIMEOUT_MS
        ? parseInt(process.env.AILLAME_OLLAMA_TIMEOUT_MS)
        : 60000,
    });

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
