import type { NextFunction, Request, Response } from 'express';
import { HttpError, sendError } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

/** 404 handler for unmatched routes. */
export function notFound(req: Request, res: Response): void {
  sendError(res, 'not_found', `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/** Central error handler. Must be registered last. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    sendError(res, err.code, err.message, err.status, err.details);
    return;
  }

  logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) });
  sendError(
    res,
    'internal_error',
    isProd ? 'Something went wrong.' : String(err),
    500,
  );
}
