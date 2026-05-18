import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../models/auth-helper';
import { RuntimeManager } from '@/services/runtime/runtime-manager.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function POST(req: NextRequest) {
  // Phase 18: Enhanced diagnostic build trigger
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json();
    const { prompt, options } = body;

    if (!prompt) {
      return NextResponse.json(ApiResponseHelper.error('GENERATE_PROMPT_REQUIRED', 'Prompt alanı zorunludur.'), { status: 400 });
    }

    const result = await RuntimeManager.generate(prompt, options);
    
    if (!result.ok) {
      // Standardize error code if it's a known runtime error
      const errorCode = result.finishReason || 'GENERATION_FAILED';
      const status = errorCode === 'RUNTIME_NOT_READY' ? 412 : 400; // Precondition Failed for not ready
      
      return NextResponse.json(
        ApiResponseHelper.error(errorCode, result.text || 'Üretim başarısız oldu.'),
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      text: result.text,
      model: {
        id: result.modelId,
        path: result.modelPath
      },
      durationMs: result.durationMs,
      tokenCount: result.tokenCount || "not_available"
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
