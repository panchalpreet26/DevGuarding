import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http.js';

const COOKIE_NAME = 'dg_session';
const SESSION_DAYS = 14;

type SessionPayload = {
  sub: string;
};

function jwtSecret(): string {
  return env.JWT_SECRET && env.JWT_SECRET !== 'replace_me_with_a_long_random_string'
    ? env.JWT_SECRET
    : 'devguardian-dev-secret-change-me';
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId } satisfies SessionPayload, jwtSecret(), {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

export function verifySession(token: string): string {
  try {
    const payload = jwt.verify(token, jwtSecret()) as SessionPayload;
    if (!payload.sub) throw new Error('missing sub');
    return payload.sub;
  } catch {
    throw new HttpError(401, 'invalid_session', 'Session expired or invalid. Sign in again.');
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export { COOKIE_NAME };
