import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../auth-helper';
import { InstalledModelRegistryService } from '@/services/model/installed-model-registry.service';
import { ActiveModelStateService } from '@/services/model/active-model-state.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function GET(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const models = (await InstalledModelRegistryService.getInstalledModels())
      .filter((model) => model.status === 'registered');
    const active = await ActiveModelStateService.getActiveState();
    
    return NextResponse.json({
      ok: true,
      models,
      active: {
        text: active.text?.modelId || null
      }
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json();
    const { path, name, type } = body;

    if (!path) {
      return NextResponse.json(ApiResponseHelper.error('MODEL_PATH_REQUIRED', 'path alanı zorunludur.'), { status: 400 });
    }

    const result = await InstalledModelRegistryService.registerModel({ path, name, type });
    
    if (!result.success) {
      return NextResponse.json(
        ApiResponseHelper.error(result.error!, result.error === 'GGUF_FILE_NOT_FOUND' ? 'Model dosyası belirtilen path’te bulunamadı.' : result.error!),
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      model: result.model
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
