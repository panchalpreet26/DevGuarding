import type { Request, Response, NextFunction } from 'express';
import {
  analyzeRepository,
  getCachedAnalysis,
} from '../services/analysis/index.js';
import { parseFullName } from '../services/github/client.js';
import { HttpError, sendOk } from '../utils/http.js';

/** POST /api/analysis — body: { fullName: "owner/repo" } */
export async function runAnalysis(
  req: Request,
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
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const fullName = `${owner}/${repo}`;
    parseFullName(fullName);

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
