import type { ApiResponse } from '@devguardian/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/** Raised when the backend returns an error envelope or the request fails. */
export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Single typed fetch wrapper for the whole app.
 * Sends cookies (credentials) so the session survives, unwraps the ApiResponse envelope.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiRequestError('invalid_response', 'Server returned a non-JSON response.', res.status);
  }

  if (!body.ok) {
    throw new ApiRequestError(body.error.code, body.error.message, res.status);
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
