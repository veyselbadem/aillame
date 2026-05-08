export type HealthStatus = "ready" | "degraded" | "blocked" | "not-configured";

export interface ComponentHealth {
  status: HealthStatus;
  available: boolean;
  configured: boolean;
  reason?: string;
  warnings: string[];
  details?: Record<string, any>;
}

export interface ProductHealth {
  overall: HealthStatus;
  timestamp: number;
  components: {
    llm: ComponentHealth;
    igm: ComponentHealth;
    providerApi: ComponentHealth;
    agent: ComponentHealth;
    memory: ComponentHealth;
    storage: ComponentHealth;
  };
  warnings: string[];
  nextRecommendedChecks: string[];
}
