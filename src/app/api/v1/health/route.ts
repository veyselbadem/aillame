import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    provider: 'aillame',
    nano: true,
    trainingReady: true,
    version: '1.2.0-stable',
    timestamp: Date.now()
  });
}
