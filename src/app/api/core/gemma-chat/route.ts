import { NextRequest, NextResponse } from 'next/server';
import { GemmaProviderError, generateGemmaResponse } from '@/core/inference/gemma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, temperature, maxTokens } = await req.json();

    if (process.env.AILLAME_GEMMA_ENABLED !== 'true') {
      return NextResponse.json({
        success: false,
        provider: 'gemma',
        code: 'disabled',
        error: 'Gemma provider devre dışı.',
        hint: 'AILLAME_GEMMA_ENABLED=true yapın ve llama-server çalıştırın.',
      }, { status: 403 });
    }

    const model = process.env.AILLAME_GEMMA_MODEL_ID || process.env.AILLAME_GEMMA_GGUF_FILE || 'gemma-4-E4B-it-Q4_K_M.gguf';
    const response = await generateGemmaResponse({
      prompt,
      messages,
      temperature,
      maxTokens,
      timeout: process.env.AILLAME_GEMMA_TIMEOUT_MS 
        ? parseInt(process.env.AILLAME_GEMMA_TIMEOUT_MS) 
        : 60000
    });

    return NextResponse.json({ success: true, provider: 'gemma', answer: response, response, model });
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
