import { NextResponse } from 'next/server';
import { ReleaseService } from '@/core/release/release-service';

export async function GET() {
  try {
    const report = ReleaseService.getBetaReleaseReport();
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
