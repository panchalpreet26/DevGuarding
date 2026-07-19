import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import {
  buildGithubAuthorizeUrl,
  exchangeCodeForToken,
  fetchGithubProfile,
} from '../services/auth/githubOAuth.js';
import {
  clearCookieOptions,
  COOKIE_NAME,
  sessionCookieOptions,
  signSession,
} from '../services/auth/session.js';
import { upsertGithubUser } from '../services/auth/userStore.js';
import { env } from '../config/env.js';
import { HttpError, sendOk } from '../utils/http.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const OAUTH_STATE_COOKIE = 'dg_oauth_state';

function clientUrl(): string {
  return env.CLIENT_URL ?? 'http://localhost:5173';
}

/** GET /api/auth/github — start OAuth. */
export function startGithubOAuth(_req: Request, res: Response, next: NextFunction): void {
  try {
    const state = randomBytes(16).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, sessionCookieOptions(10 * 60 * 1000));
    res.redirect(buildGithubAuthorizeUrl(state));
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/github/callback */
export async function githubOAuthCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    const savedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;

    if (!code) {
      throw new HttpError(400, 'missing_code', 'GitHub did not return an authorization code.');
    }
    if (!savedState || !state || savedState !== state) {
      throw new HttpError(400, 'invalid_state', 'OAuth state mismatch. Try signing in again.');
    }

    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());

    const accessToken = await exchangeCodeForToken(code);
    const profile = await fetchGithubProfile(accessToken);
    const user = await upsertGithubUser({ ...profile, accessToken });
    const session = signSession(user.id);

    res.cookie(COOKIE_NAME, session, sessionCookieOptions());
    logger.info('GitHub OAuth login', { username: user.username });

    res.redirect(`${clientUrl()}/dashboard`);
  } catch (err) {
    logger.error('GitHub OAuth callback failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    const message =
      err instanceof HttpError ? encodeURIComponent(err.message) : 'oauth_failed';
    res.redirect(`${clientUrl()}/?authError=${message}`);
  }
}

/** GET /api/auth/me */
export function getMe(req: AuthedRequest, res: Response): void {
  if (!req.user) {
    sendOk(res, { user: null });
    return;
  }
  sendOk(res, { user: req.user });
}

/** POST /api/auth/logout */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, clearCookieOptions());
  sendOk(res, { ok: true });
}

/** GET /api/auth/status — whether OAuth app env is configured. */
export function authStatus(_req: Request, res: Response): void {
  const configured = Boolean(
    env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET &&
      !env.GITHUB_CLIENT_ID.startsWith('your_') &&
      !env.GITHUB_CLIENT_SECRET.startsWith('your_'),
  );
  sendOk(res, { configured });
}
