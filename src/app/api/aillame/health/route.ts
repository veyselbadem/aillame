import { NextResponse } from 'next/server';
import { liveHealthAggregator } from '@core/health/live-aggregator';

export async function GET() {
  try {
    const health = await liveHealthAggregator.getSystemHealth();
    return NextResponse.json({
      success: true,
      service: 'aillame-external-api',
      version: '1.3.0',
      projects: ['boss-ai', 'doomsgame-engine', 'egitim-web', 'aillame-local'],
      systemHealth: health
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
