import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../auth-helper';
import { RuntimeManager } from '@/services/runtime/runtime-manager.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    await RuntimeManager.unload();
    
    return NextResponse.json({
      ok: true,
      message: "Model bellekten boşaltıldı."
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('MODEL_UNLOAD_FAILED', error.message), { status: 500 });
  }
}
