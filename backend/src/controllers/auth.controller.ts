import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import {
  buildGithubAuthorizeUrl,
  exchangeCodeForToken,
  fetchGithubProfile,
  revokeGithubToken,
} from '../services/auth/githubOAuth.js';
import {
  buildGithubAppInstallUrl,
  fetchInstallationAccount,
  isGithubAppConfigured,
  upsertInstallation,
} from '../services/auth/githubApp.js';
import {
  clearCookieOptions,
  COOKIE_NAME,
  createSession,
  revokeAllSessionsForUser,
  revokeSessionByToken,
  sessionCookieOptions,
} from '../services/auth/session.js';
import {
  clearAccessToken,
  getAccessToken,
  findUserById,
  recordLoginAudit,
  upsertGithubUser,
} from '../services/auth/userStore.js';
import { env } from '../config/env.js';
import { HttpError, sendOk } from '../utils/http.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const OAUTH_STATE_COOKIE = 'dg_oauth_state';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'GitHub did not return an authorization code. Try again.',
  invalid_state: 'Sign-in was interrupted (security check failed). Try again.',
  oauth_exchange_failed: 'Could not complete GitHub authorization. Try again.',
  oauth_not_configured: 'GitHub OAuth is not configured on the server.',
  mongo_required: 'Database is unavailable. Sign-in requires MongoDB.',
  oauth_failed: 'Sign-in failed. Try again.',
};

function clientUrl(): string {
  return env.CLIENT_URL ?? 'http://localhost:5173';
}

function redirectAuthError(res: Response, code: string, fallbackMessage?: string): void {
  const message: string =
    AUTH_ERROR_MESSAGES[code] ??
    fallbackMessage ??
    AUTH_ERROR_MESSAGES.oauth_failed ??
    'Sign-in failed. Try again.';
  res.redirect(
    `${clientUrl()}/?authError=${encodeURIComponent(code)}&authMessage=${encodeURIComponent(message)}`,
  );
}

function clientMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.ip ||
    null;
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
  return { ip, userAgent };
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
  _next: NextFunction,
): Promise<void> {
  try {
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    const savedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;

    if (!code) {
      redirectAuthError(res, 'missing_code');
      return;
    }
    if (!savedState || !state || savedState !== state) {
      redirectAuthError(res, 'invalid_state');
      return;
    }

    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());

    const accessToken = await exchangeCodeForToken(code);
    const profile = await fetchGithubProfile(accessToken);
    const user = await upsertGithubUser({ ...profile, accessToken });
    const { ip, userAgent } = clientMeta(req);
    await recordLoginAudit(user.id, { ip, userAgent });

    const session = await createSession({ userId: user.id, ip, userAgent });
    res.cookie(COOKIE_NAME, session, sessionCookieOptions());
    logger.info('GitHub OAuth login', { username: user.username });

    res.redirect(`${clientUrl()}/dashboard`);
  } catch (err) {
    logger.error('GitHub OAuth callback failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    const code = err instanceof HttpError ? err.code : 'oauth_failed';
    redirectAuthError(res, code, err instanceof Error ? err.message : undefined);
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

/** POST /api/auth/logout — revoke this session + GitHub token. */
export async function logout(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const cookie = req.cookies?.[COOKIE_NAME] as string | undefined;
    await revokeSessionByToken(cookie);

    if (req.user) {
      try {
        const stored = await findUserById(req.user.id);
        const token = stored ? getAccessToken(stored) : undefined;
        if (token) {
          await revokeGithubToken(token);
          await clearAccessToken(req.user.id);
        }
      } catch {
        // Still clear the cookie even if token revoke fails.
      }
    }

    res.clearCookie(COOKIE_NAME, clearCookieOptions());
    sendOk(res, { ok: true });
  } catch (err) {
    res.clearCookie(COOKIE_NAME, clearCookieOptions());
    next(err);
  }
}

/** POST /api/auth/logout-all — revoke every session for this user. */
export async function logoutAll(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new HttpError(401, 'unauthorized', 'Sign in with GitHub to continue.');
    }

    const stored = await findUserById(req.user.id);
    const token = stored ? getAccessToken(stored) : undefined;
    if (token) {
      await revokeGithubToken(token);
      await clearAccessToken(req.user.id);
    }

    const revoked = await revokeAllSessionsForUser(req.user.id);
    res.clearCookie(COOKIE_NAME, clearCookieOptions());
    sendOk(res, { ok: true, revoked });
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/status — whether OAuth / App env is configured. */
export function authStatus(_req: Request, res: Response): void {
  const configured = Boolean(
    env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET &&
      !env.GITHUB_CLIENT_ID.startsWith('your_') &&
      !env.GITHUB_CLIENT_SECRET.startsWith('your_'),
  );
  sendOk(res, {
    configured,
    githubAppConfigured: isGithubAppConfigured(),
    scopes: ['read:user', 'user:email', 'repo', 'read:org'],
  });
}

/** GET /api/auth/github/app/install — start GitHub App org/user install. */
export function startGithubAppInstall(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    if (!req.user) {
      throw new HttpError(401, 'unauthorized', 'Sign in with GitHub before installing the App.');
    }
    res.redirect(buildGithubAppInstallUrl());
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/github/app/callback — Setup URL after App install. */
export async function githubAppInstallCallback(
  req: AuthedRequest,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      redirectAuthError(res, 'oauth_failed', 'Sign in before completing the GitHub App install.');
      return;
    }

    const installationId = Number(req.query.installation_id ?? 0);
    if (!installationId) {
      redirectAuthError(res, 'oauth_failed', 'GitHub App install did not return an installation id.');
      return;
    }

    const account = await fetchInstallationAccount(installationId);
    await upsertInstallation({
      installationId,
      accountLogin: account.login,
      accountId: account.id,
      accountType: account.type,
      installedByUserId: req.user.id,
    });

    logger.info('GitHub App installed', {
      installationId,
      account: account.login,
      by: req.user.username,
    });

    res.redirect(`${clientUrl()}/select-repos?installed=${encodeURIComponent(account.login)}`);
  } catch (err) {
    logger.error('GitHub App install callback failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    const code = err instanceof HttpError ? err.code : 'oauth_failed';
    redirectAuthError(res, code, err instanceof Error ? err.message : undefined);
  }
}
