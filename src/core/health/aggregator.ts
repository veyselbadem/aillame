export type SubsystemStatus = "ready" | "degraded" | "disabled" | "not-configured" | "planned" | "failed";

export interface HealthComponent {
  name: string;
  status: SubsystemStatus;
  message?: string;
  version?: string;
  diagnostics?: any;
}

export interface SystemHealth {
  overallStatus: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  environment: "development" | "production";
  uptime: number;
  components: {
    runtime: HealthComponent;
    modelRegistry: HealthComponent;
    projectMemory: HealthComponent;
    externalProvider: HealthComponent;
    codeAgent: HealthComponent;
    imageWorkflow: HealthComponent;
    vectorMemory: HealthComponent;
    nanoIntelligence: HealthComponent;
    security: HealthComponent;
    desktopReadiness: HealthComponent;
  };
}

export interface HealthAggregator {
  getSystemHealth(): Promise<SystemHealth>;
}
