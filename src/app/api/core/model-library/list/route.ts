import { NextResponse } from 'next/server';
import { listLocalModels } from '@core/model-library';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const models = listLocalModels();
    return NextResponse.json({ success: true, data: { models } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model listesi alınamadı.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
