import { NextResponse } from 'next/server';
import { RuntimeAcceptanceService } from '@/core/runtime/acceptance/acceptance-service';
import { LocalServerBootStrategy } from '@/core/desktop-readiness/boot-strategy';
import { liveHealthAggregator } from '@/core/health/live-aggregator';

export async function GET() {
  try {
    const runtimeAcceptance = RuntimeAcceptanceService.getReport();
    const bootPlan = LocalServerBootStrategy.getPlan();
    const systemHealth = await liveHealthAggregator.getSystemHealth();

    const report = {
      shellAvailable: true,
      localServerBootPlanned: true,
      healthCheckReady: systemHealth.overallStatus === 'healthy',
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
