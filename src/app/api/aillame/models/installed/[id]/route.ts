import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../auth-helper';
import { InstalledModelRegistryService } from '@/services/model/installed-model-registry.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  const { id } = await params;

  try {
    const removed = await InstalledModelRegistryService.unregisterModel(id);
    
    if (!removed) {
      return NextResponse.json(ApiResponseHelper.error('MODEL_NOT_FOUND', 'Model kaydı bulunamadı.'), { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      removed: true,
      message: 'Model kaydı kaldırıldı. Dosya diskten silinmedi.'
    });
  } catch (error: any) {
    return NextResponse.json(ApiResponseHelper.error('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
