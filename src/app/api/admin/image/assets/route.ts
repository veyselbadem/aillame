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
    return NextResponse.json({ success: false, error: 'Asset ID is required' }, { status: 400 });
  }

  try {
    const success = await imageAssetStore.deleteAsset(assetId);
    if (!success) {
      console.log('Asset not found in store:', assetId);
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Cleanup job records as well
    const { imageJobStore } = require('@/core/runtime/image/jobs/image-job-file-store');
    await imageJobStore.removeAssetIdFromJobs(assetId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
