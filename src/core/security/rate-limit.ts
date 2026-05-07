export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
  strategy: "ip" | "api-key" | "project";
}

export interface RateLimitState {
  currentRequests: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  policy: RateLimitPolicy;
}

export interface ProductionGuards {
  NODE_ENV: string;
  authRequired: boolean;
  externalBindingExposed: boolean;
  dangerousToolsDisabled: boolean;
  autonomousActionsEnabled: boolean; // Must be false in production by default
  modelPathExposureGuard: boolean;
}
