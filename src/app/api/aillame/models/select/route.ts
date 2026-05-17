import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../auth-helper';
import { ActiveModelStateService } from '@/services/model/active-model-state.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json();
    const { modelId, type } = body;

    if (!modelId) {
      return NextResponse.json(ApiResponseHelper.error('MODEL_ID_REQUIRED', 'modelId alanı zorunludur.'), { status: 400 });
    }

    if (type && type !== 'text') {
      return NextResponse.json(ApiResponseHelper.error('NOT_IMPLEMENTED_IN_PHASE_2', 'Şu an sadece text tipi model seçimi desteklenmektedir.'), { status: 400 });
    }

    const result = await ActiveModelStateService.selectModel(modelId, 'text');
    
    if (!result.success) {
      return NextResponse.json(ApiResponseHelper.error(result.error!, result.error!), { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      active: result.state
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
