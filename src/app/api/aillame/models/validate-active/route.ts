import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../auth-helper';
import { ActiveModelStateService } from '@/services/model/active-model-state.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const validation = await ActiveModelStateService.validateActiveModel();
    return NextResponse.json({
      ok: true,
      ...validation
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
