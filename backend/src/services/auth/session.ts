import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { isMongoConnected } from '../../config/db.js';
import { jwtSecret } from '../../config/secrets.js';
import { SessionModel } from '../../models/Session.js';
import { HttpError } from '../../utils/http.js';
import { isProd } from '../../config/env.js';

const COOKIE_NAME = 'dg_session';
const SESSION_DAYS = 14;

type SessionPayload = {
  sub: string;
  jti: string;
};

export type CreateSessionInput = {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
};

function requireMongoForSessions(): void {
  if (!isMongoConnected()) {
    throw new HttpError(
      503,
      'mongo_required',
      'MongoDB is required for sign-in sessions. Start Mongo or set MONGODB_URI.',
    );
  }
}

export async function createSession(input: CreateSessionInput): Promise<string> {
  requireMongoForSessions();

  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await SessionModel.create({
    jti,
    userId: input.userId,
    expiresAt,
    userAgent: input.userAgent ?? null,
    ip: input.ip ?? null,
  });

  return jwt.sign({ sub: input.userId, jti } satisfies SessionPayload, jwtSecret(), {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

/** Verify JWT + Mongo session row; returns userId. */
export async function verifySession(token: string): Promise<string> {
  requireMongoForSessions();

  let payload: SessionPayload;
  try {
    payload = jwt.verify(token, jwtSecret()) as SessionPayload;
  } catch {
    throw new HttpError(401, 'invalid_session', 'Session expired or invalid. Sign in again.');
  }

  if (!payload.sub || !payload.jti) {
    throw new HttpError(401, 'invalid_session', 'Session expired or invalid. Sign in again.');
  }

  const row = await SessionModel.findOne({ jti: payload.jti }).exec();
  if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now() || row.userId !== payload.sub) {
    throw new HttpError(401, 'invalid_session', 'Session expired or invalid. Sign in again.');
  }

  return payload.sub;
}

export async function revokeSessionByToken(token: string | undefined): Promise<void> {
  if (!token || !isMongoConnected()) return;

  try {
    const payload = jwt.verify(token, jwtSecret(), { ignoreExpiration: true }) as SessionPayload;
    if (!payload.jti) return;
    await SessionModel.updateOne(
      { jti: payload.jti, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  } catch {
    // Cookie already invalid — nothing to revoke.
  }
}

export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  requireMongoForSessions();
  const result = await SessionModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).exec();
  return result.modifiedCount;
}

/**
 * Cookie options for session + OAuth state.
 * Production uses SameSite=None; Secure so Vercel (FE) can talk to Render (BE) with credentials.
 */
export function sessionCookieOptions(maxAgeMs = SESSION_DAYS * 24 * 60 * 60 * 1000) {
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
}

export { COOKIE_NAME };
