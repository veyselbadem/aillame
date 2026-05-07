export type DesktopShellStatus = 'ready' | 'degraded' | 'not-configured' | 'planned' | 'failed';
export type LocalServerBootStatus = 'starting' | 'running' | 'stopped' | 'failed';

export interface DesktopRuntimeAcceptance {
  textRuntimeReady: boolean;
  imageRuntimeReady: boolean;
  finalAcceptanceReady: boolean;
  blockers: string[];
}

export interface DesktopPackagingReadiness {
  manifestValid: boolean;
  iconsAvailable: boolean;
  binariesIncluded: boolean;
  status: 'planned' | 'in-progress' | 'ready';
}

export interface DesktopReadinessReport {
  shellAvailable: boolean;
  localServerBootPlanned: boolean;
  healthCheckReady: boolean;
  runtimeAcceptance: DesktopRuntimeAcceptance;
  storageReady: boolean;
  securityReady: boolean;
  packagingReady: boolean;
  status: DesktopShellStatus;
  timestamp: number;
}

export interface DesktopReadinessDiagnostics {
  shellStatus: DesktopShellStatus;
  serverBootStatus: LocalServerBootStatus;
  report: DesktopReadinessReport;
  packaging: DesktopPackagingReadiness;
  issues: string[];
  nextActions: string[];
}
