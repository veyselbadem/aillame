import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../auth-helper';
import { ActiveModelStateService } from '@/services/model/active-model-state.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function GET(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const state = await ActiveModelStateService.getActiveState();
    return NextResponse.json({
      ok: true,
      active: state
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
