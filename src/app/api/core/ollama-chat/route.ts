import { NextRequest, NextResponse } from 'next/server';
import { generateOllamaResponse } from '@/core/inference/ollama';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, temperature, maxTokens } = await req.json();

    if (process.env.AILLAME_OLLAMA_ENABLED === 'false') {
      return NextResponse.json({ error: 'Ollama provider is disabled.' }, { status: 403 });
    }

    const response = await generateOllamaResponse({
      prompt,
      messages,
      temperature,
      maxTokens,
      timeout: process.env.AILLAME_OLLAMA_TIMEOUT_MS
        ? parseInt(process.env.AILLAME_OLLAMA_TIMEOUT_MS)
        : 60000,
    });

    return NextResponse.json({ response });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
