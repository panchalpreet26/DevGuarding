import type { Request, Response, NextFunction } from 'express';
import { listUserRepos, getRepo, parseFullName } from '../services/github/client.js';
import { sendOk } from '../utils/http.js';

/** GET /api/repos — list repositories for the configured GITHUB_TOKEN user. */
export async function listRepos(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repos = await listUserRepos();
    sendOk(res, { repos });
  } catch (err) {
    next(err);
  }
}

/** GET /api/repos/:owner/:repo — metadata for one repository. */
export async function getRepository(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const meta = await getRepo(owner, repo);
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
