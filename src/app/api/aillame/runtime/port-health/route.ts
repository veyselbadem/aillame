import { NextResponse } from 'next/server';
import { checkLocalPort } from '@/core/runtime/port-health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const health = await checkLocalPort();
    return NextResponse.json(health, { status: health.ok ? 200 : 409 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      host: process.env.AILLAME_LOCAL_SERVER_HOST ?? '127.0.0.1',
      port: Number(process.env.AILLAME_LOCAL_SERVER_PORT || 3000),
      available: false,
      occupied: false,
      owner: 'unknown',
      message: 'Port durumu kontrol edilemedi.',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
