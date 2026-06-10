import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { SECURITY_CONFIG } from '../config/constants';
import ApiError from '../utils/ApiError';
import { logger } from '../utils/logger';

/**
 * Redis sliding window rate-limiting middleware
 */
export const rateLimiter = (
  windowMs: number = SECURITY_CONFIG.SLIDING_WINDOW_RATE_LIMIT_MS,
  maxRequests: number = SECURITY_CONFIG.SLIDING_WINDOW_MAX_REQUESTS
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Target rate limits on user ID (if logged in) or fallback to request IP address
      const identifier = req.user?.id || req.ip || 'anonymous';
      const key = `rate_limit:${req.method}:${req.path}:${identifier}`;
      
      const now = Date.now();
      const clearBefore = now - windowMs;

      // Start Redis transaction
      const multi = redis.multi();
      multi.zadd(key, now, `${now}-${Math.random()}`); // Add unique member to avoid overriding duplicate timestamps
      multi.zremrangebyscore(key, 0, clearBefore);
      multi.zcard(key);
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      if (!results) {
        throw new ApiError(500, 'Rate limiter error');
      }

      // zcard result is at index 2 (element 2 of multi results)
      const countResult = results[2][1];
      const requestCount = typeof countResult === 'number' ? countResult : 0;

      if (requestCount > maxRequests) {
        logger.warn(`⚠️ Rate limit exceeded: ${identifier} requested ${req.method} ${req.path}`);
        throw new ApiError(429, 'Too many requests. Please try again later.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default rateLimiter;
