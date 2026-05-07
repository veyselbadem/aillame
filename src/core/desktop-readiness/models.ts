export type DesktopBootStatus = "starting" | "ready" | "degraded" | "failed";
export type LocalServerStatus = "stopped" | "running" | "unreachable";

export interface DesktopRuntimeCheck {
  serverReachable: boolean;
  port: number;
  environment: "development" | "production";
}

export interface DesktopReadinessDiagnostics {
  bootStatus: DesktopBootStatus;
  serverStatus: LocalServerStatus;
  runtime: DesktopRuntimeCheck;
  offlineMode: boolean;
  issues?: string[];
}
