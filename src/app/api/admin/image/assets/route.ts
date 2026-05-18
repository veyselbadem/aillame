import { NextRequest, NextResponse } from 'next/server';
import { imageAssetStore } from '@/core/runtime/image/assets/image-asset-file-store';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  try {
    const assets = await imageAssetStore.listAssets({ projectId });
    return NextResponse.json({ success: true, assets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
export async function DELETE(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('assetId');

  if (!assetId) {
    return NextResponse.json(
      { ok: false, success: false, error: 'assetId zorunludur' },
      { status: 400 }
    );
  }

  try {
    const { imageJobStore } = await import('@/core/runtime/image/jobs/image-job-file-store');

    const asset = await imageAssetStore.getAsset(assetId);

    if (!asset) {
      console.warn(`[ImageAssetDelete] Asset store'da bulunamadı: ${assetId} — hayalet kayıt, job referansları temizleniyor.`);

      // Asset store'da kayıt yoksa ölümcül hata saymıyoruz.
      // Job referanslarını yine de temizlemeye çalış (eski/senkron dışı durumlar için).
      try {
        await imageJobStore.removeAssetIdFromJobs(assetId);
      } catch {
        // Job store temizleme opsiyonel, hata fırlatmasın
      }

      return NextResponse.json({
        ok: true,
        success: true,
        deleted: false,
        reason: "Asset store'da bulunamadı. Muhtemelen eski, senkron dışı veya daha önce silinmiş kayıt.",
        assetId,
      });
    }

    // Asset bulundu — sil
    const deleted = await imageAssetStore.deleteAsset(assetId);

    // Job store'dan referansı da kaldır
    try {
      await imageJobStore.removeAssetIdFromJobs(assetId);
    } catch {
      // Job store temizleme opsiyonel
    }

    return NextResponse.json({ ok: true, success: true, deleted, assetId });
  } catch (error: any) {
    console.error('[ImageAssetDelete] Silme hatası:', error);
    return NextResponse.json(
      { ok: false, success: false, error: 'Görsel asset silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
