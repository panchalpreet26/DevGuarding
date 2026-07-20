import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/http.js';

type Bucket = { count: number; resetAt: number };

// ponytail: process-local token bucket (ceil: multi-instance uneven; upgrade: Redis)
const buckets = new Map<string, Bucket>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      next(
        new HttpError(
          429,
          'rate_limited',
          'Too many auth requests. Wait a minute and try again.',
        ),
      );
      return;
    }

    next();
  };
}
