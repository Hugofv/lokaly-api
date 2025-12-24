/**
 * Rate Limiter Middleware
 * 
 * Simple in-memory rate limiter for public API.
 * In production, use Redis-based rate limiting for distributed systems.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimiter(
  ip: string,
  options: {
    maxRequests?: number;
    windowMs?: number;
  } = {}
): { allowed: boolean; remaining: number; resetAt: number } {
  const { maxRequests = 100, windowMs = 60000 } = options;
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

