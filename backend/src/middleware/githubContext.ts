import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from './auth.js';
import { githubTokenStore } from '../services/github/client.js';

/** Propagate the OAuth GitHub token (+ user id) into AsyncLocalStorage for GitHub API calls. */
export function bindGithubToken(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): void {
  githubTokenStore.run({ token: req.githubAccessToken, userId: req.user?.id }, () => next());
}
