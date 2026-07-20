import type { NextFunction, Request, Response } from 'express';
import type { User } from '@devguardian/shared';
import { COOKIE_NAME, verifySession } from '../services/auth/session.js';
import { findUserById, getAccessToken, toPublic } from '../services/auth/userStore.js';
import { HttpError } from '../utils/http.js';
import { isMongoConnected } from '../config/db.js';

export type AuthedRequest = Request & {
  user?: User;
  githubAccessToken?: string;
};

/** Attach user + GitHub token when a valid (non-revoked) session cookie is present. */
export async function attachUser(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!token) {
      next();
      return;
    }

    if (!isMongoConnected()) {
      next();
      return;
    }

    const userId = await verifySession(token);
    const stored = await findUserById(userId);
    if (!stored) {
      next();
      return;
    }

    req.user = toPublic(stored);
    const access = getAccessToken(stored);
    if (access) req.githubAccessToken = access;
    next();
  } catch {
    // Invalid / revoked cookie — treat as logged out
    next();
  }
}

/** Require a signed-in GitHub user with a usable access token. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!req.user || !req.githubAccessToken) {
    next(
      new HttpError(
        401,
        'unauthorized',
        'Sign in with GitHub to continue. If you were signed in, your session expired — sign in again.',
      ),
    );
    return;
  }
  next();
}
