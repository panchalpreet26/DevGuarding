import type { Response, NextFunction } from 'express';
import {
  assertRepoConnected,
  listAccessibleUserRepos,
  listUserRepos,
  getRepo,
  parseFullName,
} from '../services/github/client.js';
import { listInstallationRepos } from '../services/auth/githubApp.js';
import { setSelectedRepos } from '../services/auth/userStore.js';
import { HttpError, sendOk } from '../utils/http.js';
import type { AuthedRequest } from '../middleware/auth.js';

function mergeReposByFullName<T extends { fullName: string }>(lists: T[][]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) {
    for (const repo of list) {
      map.set(repo.fullName.toLowerCase(), repo);
    }
  }
  return [...map.values()];
}

/** GET /api/repos — connected repos only (for switcher / analysis). */
export async function listRepos(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const selected = req.user?.selectedRepos ?? [];
    const repos = await listUserRepos(req.githubAccessToken, selected);
    sendOk(res, { repos, selectedRepos: selected });
  } catch (err) {
    next(err);
  }
}

/** GET /api/repos/available — OAuth-accessible + GitHub App installation repos. */
export async function listAvailableRepos(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [oauthRepos, installRepos] = await Promise.all([
      listAccessibleUserRepos(req.githubAccessToken),
      listInstallationRepos().catch(() => []),
    ]);
    const repos = mergeReposByFullName([oauthRepos, installRepos]);
    sendOk(res, {
      repos,
      selectedRepos: req.user?.selectedRepos ?? [],
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/repos/selection — body: { fullNames: string[] } */
export async function saveRepoSelection(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new HttpError(401, 'unauthorized', 'Sign in with GitHub to continue.');
    }

    const raw = req.body?.fullNames;
    if (!Array.isArray(raw)) {
      throw new HttpError(400, 'invalid_body', 'Body must include fullNames: string[].');
    }

    const requested = raw.map((item: unknown) => String(item).trim()).filter(Boolean);
    for (const name of requested) {
      parseFullName(name);
    }

    const [oauthRepos, installRepos] = await Promise.all([
      listAccessibleUserRepos(req.githubAccessToken),
      listInstallationRepos().catch(() => []),
    ]);
    const allowed = mergeReposByFullName([oauthRepos, installRepos]);
    const allowedSet = new Set(allowed.map((r) => r.fullName.toLowerCase()));
    const invalid = requested.filter((name) => !allowedSet.has(name.toLowerCase()));
    if (invalid.length) {
      throw new HttpError(
        400,
        'invalid_repos',
        'Only repositories you can access (OAuth or GitHub App install) can be connected.',
        { invalid },
      );
    }

    const user = await setSelectedRepos(req.user.id, requested);
    const repos = await listUserRepos(req.githubAccessToken, user.selectedRepos);
    sendOk(res, { user, repos });
  } catch (err) {
    next(err);
  }
}

/** GET /api/repos/:owner/:repo — metadata for one connected repository. */
export async function getRepository(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const fullName = `${owner}/${repo}`;
    assertRepoConnected(fullName, req.user?.selectedRepos ?? []);
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
