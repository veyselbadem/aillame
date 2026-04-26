import type { ExternalRateLimitProfile } from '../types';
import type { ExternalRateLimitResult, ExternalRateLimitState } from './types';
import { RATE_LIMIT_PROFILES } from './types';

const state = new Map<string, ExternalRateLimitState>();
const WINDOW_MS = 60_000;

export function getRateLimitForProfile(profile: ExternalRateLimitProfile): number {
  return RATE_LIMIT_PROFILES[profile] ?? RATE_LIMIT_PROFILES.standard;
}

export function checkExternalRateLimit(projectId: string, profile: ExternalRateLimitProfile): ExternalRateLimitResult {
  const limit = getRateLimitForProfile(profile);
  const now = Date.now();
  const existing = state.get(projectId);
  let windowStartMs = now;
  let count = 0;

  if (existing && now < existing.windowStartMs + WINDOW_MS) {
    windowStartMs = existing.windowStartMs;
    count = existing.count;
  }

  count += 1;
  state.set(projectId, { count, windowStartMs });

  const resetAt = windowStartMs + WINDOW_MS;

  if (count > limit) {
    return {
      success: false,
      statusCode: 429,
      error: 'Rate limit exceeded.',
      remaining: 0,
      resetAt,
      profile,
    };
  }

  return {
    success: true,
    statusCode: 200,
    remaining: Math.max(0, limit - count),
    resetAt,
    profile,
  };
}

export function resetExternalRateLimitState(): void {
  state.clear();
}
