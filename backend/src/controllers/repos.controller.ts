import type { Request, Response, NextFunction } from 'express';
import { listUserRepos, getRepo, parseFullName } from '../services/github/client.js';
import { sendOk } from '../utils/http.js';
import type { AuthedRequest } from '../middleware/auth.js';

/** GET /api/repos — list repositories for the signed-in GitHub user. */
export async function listRepos(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repos = await listUserRepos(req.githubAccessToken);
    sendOk(res, { repos });
  } catch (err) {
    next(err);
  }
}

/** GET /api/repos/:owner/:repo — metadata for one repository. */
export async function getRepository(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const meta = await getRepo(owner, repo, req.githubAccessToken);
    sendOk(res, { repo: meta });
  } catch (err) {
    next(err);
  }
}

/** Resolve owner/repo from body.fullName for convenience in other controllers. */
export function resolveFullName(body: unknown): string {
  const fullName =
    typeof body === 'object' && body && 'fullName' in body
      ? String((body as { fullName: unknown }).fullName)
      : '';
  parseFullName(fullName);
  return fullName.trim();
}

// silence unused Request import warning if any tooling complains
export type { Request };
