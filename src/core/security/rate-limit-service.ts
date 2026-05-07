import { RateLimitPolicy, RateLimitResult, RateLimitState } from './rate-limit';

/**
 * In-memory rate limiter foundation.
 */
class InMemoryRateLimiter {
  private states = new Map<string, RateLimitState>();

  check(key: string, policy: RateLimitPolicy): RateLimitResult {
    const now = Date.now();
    let state = this.states.get(key);

    // Reset if window expired
    if (!state || now > state.resetAt) {
      state = {
        currentRequests: 0,
        resetAt: now + policy.windowMs
      };
    }

    state.currentRequests += 1;
    this.states.set(key, state);

    const allowed = state.currentRequests <= policy.maxRequests;
    
    return {
      allowed,
      remaining: Math.max(0, policy.maxRequests - state.currentRequests),
      resetAt: state.resetAt,
      policy
    };
  }

  getDiagnostics() {
    return {
      activeBuckets: this.states.size,
      store: "in-memory"
    };
  }
}

const limiter = new InMemoryRateLimiter();

export class RateLimitService {
  private readonly DEFAULT_POLICY: RateLimitPolicy = {
    windowMs: 60000, // 1 minute
    maxRequests: 60,
    strategy: "api-key"
  };

  /**
   * Checks rate limit for a request.
   */
  checkLimit(identifier: string, customPolicy?: Partial<RateLimitPolicy>): RateLimitResult {
    const policy = { ...this.DEFAULT_POLICY, ...customPolicy };
    
    // In development, we might want to relax limits
    if (process.env.NODE_ENV !== 'production' && process.env.AILLAME_RATE_LIMIT_ENABLED !== 'true') {
      return {
        allowed: true,
        remaining: 999,
        resetAt: Date.now() + policy.windowMs,
        policy
      };
    }

    return limiter.check(identifier, policy);
  }

  getDiagnostics() {
    return limiter.getDiagnostics();
  }
}

export const rateLimitService = new RateLimitService();
