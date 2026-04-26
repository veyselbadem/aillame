import { NextRequest, NextResponse } from 'next/server';
import { generateImageWithSdxl } from '@core/image-generation/sdxl';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateImageWithSdxl(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Görsel üretimi başarısız oldu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
