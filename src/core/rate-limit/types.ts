import { ApiClientRateLimitProfile } from '../api-clients/types';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMIT_CONFIGS: Record<ApiClientRateLimitProfile, RateLimitConfig> = {
  low: { maxRequests: 5, windowMs: 60 * 1000 },       // 5 requests per minute
  standard: { maxRequests: 30, windowMs: 60 * 1000 },  // 30 requests per minute
  trusted: { maxRequests: 120, windowMs: 60 * 1000 },  // 120 requests per minute
  unlimited_local: { maxRequests: 10000, windowMs: 60 * 1000 },
};

export interface RateLimitStatus {
  clientId: string;
  count: number;
  resetAt: number;
  isExceeded: boolean;
  remaining: number;
}
