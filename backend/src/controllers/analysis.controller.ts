import type { Response, NextFunction } from 'express';
import {
  analyzeRepository,
  getCachedAnalysis,
} from '../services/analysis/index.js';
import { assertRepoConnected, parseFullName } from '../services/github/client.js';
import { HttpError, sendOk } from '../utils/http.js';
import type { AuthedRequest } from '../middleware/auth.js';

/** POST /api/analysis — body: { fullName: "owner/repo" } */
export async function runAnalysis(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const fullName =
      typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    if (!fullName) {
      throw new HttpError(400, 'missing_full_name', 'Body must include fullName: "owner/repo".');
    }
    parseFullName(fullName);
    assertRepoConnected(fullName, req.user?.selectedRepos ?? []);

    const force = Boolean(req.body?.force);
    if (!force) {
      const cached = getCachedAnalysis(fullName);
      if (cached) {
        sendOk(res, { analysis: cached, cached: true });
        return;
      }
    }

    const analysis = await analyzeRepository(fullName);
    sendOk(res, { analysis, cached: false });
  } catch (err) {
    next(err);
  }
}

/** GET /api/analysis/:owner/:repo — cached analysis only (404 if never analyzed). */
export async function getAnalysis(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const fullName = `${owner}/${repo}`;
    parseFullName(fullName);
    assertRepoConnected(fullName, (req as AuthedRequest).user?.selectedRepos ?? []);

    const cached = getCachedAnalysis(fullName);
    if (!cached) {
      throw new HttpError(
        404,
        'analysis_not_found',
        'No analysis cached for this repository. POST /api/analysis first.',
      );
    }
    sendOk(res, { analysis: cached, cached: true });
  } catch (err) {
    next(err);
  }
}
