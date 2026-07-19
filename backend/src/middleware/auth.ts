import type { NextFunction, Request, Response } from 'express';
import type { User } from '@devguardian/shared';
import { COOKIE_NAME, verifySession } from '../services/auth/session.js';
import { findUserById, getAccessToken, toPublic } from '../services/auth/userStore.js';
import { HttpError } from '../utils/http.js';

export type AuthedRequest = Request & {
  user?: User;
  githubAccessToken?: string;
};

/** Attach user + GitHub token when a valid session cookie is present. */
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

    const userId = verifySession(token);
    const stored = await findUserById(userId);
    if (!stored) {
      next();
      return;
    }

    req.user = toPublic(stored);
    req.githubAccessToken = getAccessToken(stored);
    next();
  } catch {
    // Invalid cookie — treat as logged out
    next();
  }
}

/** Require a signed-in GitHub user. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!req.user || !req.githubAccessToken) {
    next(new HttpError(401, 'unauthorized', 'Sign in with GitHub to continue.'));
    return;
  }
  next();
}
