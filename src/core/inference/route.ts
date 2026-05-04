import { NextRequest, NextResponse } from 'next/server';
import { generateOllamaResponse } from '@/core/inference/ollama';
import { generateWithTextRuntimeRouter } from '@core/inference/text-runtime-router';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, temperature, maxTokens } = await req.json();

    if (process.env.AILLAME_OLLAMA_ENABLED === 'false') {
      return NextResponse.json({ success: false, error: 'Ollama provider is disabled.', provider: 'ollama' }, { status: 403 });
    }

    const result = await generateWithTextRuntimeRouter({
      prompt,
      messages,
      temperature,
      maxTokens,
      preferredProvider: 'ollama',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Ollama runtime failed', provider: 'ollama' },
        { status: result.code === 'disabled' ? 403 : 500 }
      );
    }

    const response = result.answer || '';

    return NextResponse.json({ success: true, answer: response, provider: 'ollama', model: process.env.AILLAME_OLLAMA_TEXT_MODEL || 'gemma:2b' });
  } catch (error: any) {
    console.error('[Ollama API Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Ollama server offline', provider: 'ollama' }, { status: 500 });
  }
}