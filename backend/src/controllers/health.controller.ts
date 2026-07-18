import type { Request, Response } from 'express';
import { sendOk } from '../utils/http.js';
import { env } from '../config/env.js';

/** Liveness/readiness probe payload. */
export function getHealth(_req: Request, res: Response): void {
  sendOk(res, {
    status: 'ok',
    service: 'devguardian-backend',
    env: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
