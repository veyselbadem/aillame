import { NextRequest, NextResponse } from 'next/server';
import { ReleaseService } from '@/core/release/release-service';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  try {
    const report = ReleaseService.getBetaReleaseReport();
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
