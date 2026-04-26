import type { ExternalRateLimitProfile } from '../types';

export type ExternalRateLimitState = {
  count: number;
  windowStartMs: number;
};

export type ExternalRateLimitResult = {
  success: boolean;
  statusCode: number;
  error?: string;
  remaining?: number;
  resetAt?: number;
  profile: ExternalRateLimitProfile;
};

export const RATE_LIMIT_PROFILES: Record<ExternalRateLimitProfile, number> = {
  low: 10,
  standard: 60,
  trusted: 300,
};
