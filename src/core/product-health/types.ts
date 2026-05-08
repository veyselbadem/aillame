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
  releaseCandidate: {
    label: "Beta RC Ready" | "Degraded" | "Blocked";
    llm: "Ready" | "Degraded" | "Not Configured" | "Blocked";
    igm: "Ready" | "Degraded" | "Not Configured" | "Blocked";
    cpuFallback: "Ready" | "Performance Warning";
    providerApi: "Ready" | "Degraded" | "Blocked";
    agent: "Beta-Lock Ready" | "Blocked";
    memory: "Ready" | "Degraded" | "Blocked";
    productHealth: "Ready";
    artifactHygiene: "Clean";
    finalSmoke: "Ready" | "Pending";
  };
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
