import type { Response } from 'express';
import type { ApiResponse } from '@devguardian/shared';

/** Send a standardised success envelope. */
export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { ok: true, data };
  res.status(status).json(body);
}

/** Send a standardised error envelope. */
export function sendError(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): void {
  const body: ApiResponse<never> = { ok: false, error: { code, message, details } };
  res.status(status).json(body);
}

/** Thrown by services/controllers to produce a controlled HTTP error. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
