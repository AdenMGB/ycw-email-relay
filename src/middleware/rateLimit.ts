import type { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors.js';

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: Request): string {
  return req.apiKeyData?.client_id || req.ip || 'anonymous';
}

function getRateLimit(req: Request): number {
  return req.apiKeyData?.rate_limit || 1000;
}

export function createRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = getRateLimitKey(req);
      const limit = getRateLimit(req);
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour

      let record = rateLimitStore.get(key);

      if (!record || now > record.resetTime) {
        record = {
          count: 0,
          resetTime: now + windowMs,
        };
        rateLimitStore.set(key, record);
      }

      record.count++;

      const remaining = Math.max(0, limit - record.count);
      const resetTime = Math.floor(record.resetTime / 1000);

      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      if (record.count > limit) {
        throw new RateLimitError('Rate limit exceeded');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

