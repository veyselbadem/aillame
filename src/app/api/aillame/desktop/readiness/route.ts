import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { RuntimeAcceptanceService } from '@/core/runtime/acceptance/acceptance-service';
import { LocalServerBootStrategy } from '@/core/desktop-readiness/boot-strategy';
import { liveHealthAggregator } from '@/core/health/live-aggregator';
import { checkLocalPort } from '@/core/runtime/port-health';

export async function GET() {
  try {
    const runtimeAcceptance = RuntimeAcceptanceService.getReport();
    const bootPlan = LocalServerBootStrategy.getPlan();
    const [systemHealth, portHealth] = await Promise.all([
      liveHealthAggregator.getSystemHealth(),
      checkLocalPort({ host: bootPlan.defaultHost, port: bootPlan.defaultPort }),
    ]);

    const report = {
      shellAvailable: true,
      localServerBootPlanned: true,
      healthCheckReady: systemHealth.overallStatus === 'healthy',
      portHealth,
      runtimeAcceptance: {
        textRuntimeReady: runtimeAcceptance.text.finalAcceptanceReady,
        imageRuntimeReady: runtimeAcceptance.image.finalAcceptanceReady,
        finalAcceptanceReady: runtimeAcceptance.overall.finalAcceptanceReady,
        blockers: runtimeAcceptance.overall.blockers
      },
      storageReady: systemHealth.overallStatus === 'healthy', // Simplified
      securityReady: true,
      packagingReady: false,
      status: runtimeAcceptance.overall.finalAcceptanceReady ? 'ready' : 'degraded',
      timestamp: Date.now()
    };

    return NextResponse.json({
      success: true,
      desktop: {
        bootPlan,
        portHealth,
        status: report.status
      },
      runtimeAcceptance,
      health: systemHealth,
      report
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
