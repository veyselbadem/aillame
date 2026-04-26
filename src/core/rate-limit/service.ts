import { ApiClientRateLimitProfile } from '../api-clients/types';
import { RATE_LIMIT_CONFIGS, RateLimitStatus } from './types';

// In-memory store for rate limits (MVP)
// In production, this would use Redis or a similar shared store.
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Checks if a client has exceeded its rate limit.
 * Increments the count if not exceeded.
 */
export async function checkRateLimit(
  clientId: string,
  profile: ApiClientRateLimitProfile
): Promise<RateLimitStatus> {
  const now = Date.now();
  const config = RATE_LIMIT_CONFIGS[profile] || RATE_LIMIT_CONFIGS.standard;
  
  let entry = store.get(clientId);
  
  // Initialize or reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    store.set(clientId, entry);
  }
  
  const isExceeded = entry.count >= config.maxRequests;
  
  if (!isExceeded) {
    entry.count += 1;
  }
  
  return {
    clientId,
    count: entry.count,
    resetAt: entry.resetAt,
    isExceeded,
    remaining: Math.max(0, config.maxRequests - entry.count),
  };
}

/**
 * Helper to cleanup old entries from the store (optional utility)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}
