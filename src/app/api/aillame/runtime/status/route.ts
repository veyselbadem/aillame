import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../models/auth-helper';
import { RuntimeManager } from '@/services/runtime/runtime-manager.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function GET(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const status = RuntimeManager.getTextRuntimeStatus();
    
    return NextResponse.json({
      ok: true,
      runtime: {
        text: status
      }
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
