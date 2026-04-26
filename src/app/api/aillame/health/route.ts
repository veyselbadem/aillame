import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'aillame-external-api',
    version: 'mvp-planning',
    projects: ['boss-ai', 'doomsgame-engine', 'egitim-web', 'aillame-local'],
  });
}
