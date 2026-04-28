import { NextRequest, NextResponse } from 'next/server';
import { generateGemmaResponse } from '@/core/inference/gemma';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, temperature, maxTokens } = await req.json();

    if (process.env.AILLAME_GEMMA_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Gemma provider is disabled.' }, { status: 403 });
    }

    const response = await generateGemmaResponse({
      prompt,
      messages,
      temperature,
      maxTokens,
      timeout: process.env.AILLAME_GEMMA_TIMEOUT_MS 
        ? parseInt(process.env.AILLAME_GEMMA_TIMEOUT_MS) 
        : 30000
    });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('[Gemma API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
