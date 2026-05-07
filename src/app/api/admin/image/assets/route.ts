import { NextResponse } from 'next/server';
import { imageAssetStore } from '@/core/runtime/image/assets/image-asset-file-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  try {
    const assets = await imageAssetStore.listAssets({ projectId });
    return NextResponse.json({ success: true, assets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
