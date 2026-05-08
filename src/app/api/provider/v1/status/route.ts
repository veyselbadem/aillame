import { NextRequest, NextResponse } from 'next/server';
import { validateExternalClientRequest } from '@/core/external-auth/client-auth';
import { RuntimeAcceptanceService } from '@/core/runtime/acceptance/acceptance-service';

export async function GET(req: NextRequest) {
  const authResult = await validateExternalClientRequest(req);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const report = RuntimeAcceptanceService.getReport();
  
  return NextResponse.json({
    success: true,
    provider: 'aillame-local',
    status: {
      ready: report.overall.finalAcceptanceReady,
      text: report.text?.status || 'UNKNOWN',
      image: report.image?.status || 'UNKNOWN',
      timestamp: report.timestamp
    },
    diagnostics: {
      device: report.image?.deviceDetails || 'Local',
      cpuFallback: report.image?.deviceDetails?.toLowerCase().includes('fallback') || false,
      blockers: report.overall.blockers
    }
  });
}
