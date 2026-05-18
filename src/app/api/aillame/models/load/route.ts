import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../auth-helper';
import { RuntimeManager } from '@/services/runtime/runtime-manager.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const result = await RuntimeManager.loadActiveTextModel();
    
    if (!result.ok) {
      return NextResponse.json(
        ApiResponseHelper.error(result.error?.code || 'RUNTIME_LOAD_FAILED', result.error?.message || 'Model yüklenemedi.'),
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      model: {
        id: result.modelId,
        path: result.modelPath,
        status: "ready"
      },
      load: {
        durationMs: result.durationMs
      }
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
