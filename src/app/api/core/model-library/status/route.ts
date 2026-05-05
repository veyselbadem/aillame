import { NextRequest, NextResponse } from 'next/server';
import { getLocalModelStatus } from '@core/model-library';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const modelId = req.nextUrl.searchParams.get('modelId') || '';
  if (!modelId.trim()) {
    return NextResponse.json({ success: false, error: 'modelId zorunludur.' }, { status: 400 });
  }

  try {
    const status = getLocalModelStatus(modelId);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model status alınamadı.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
