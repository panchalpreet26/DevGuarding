import type { Response, NextFunction } from 'express';
import {
  getCachedGuardianReport,
  runGuardianCompare,
} from '../services/guardian/runGuardian.js';
import { assertRepoConnected, parseFullName } from '../services/github/client.js';
import { HttpError, sendOk } from '../utils/http.js';
import type { AuthedRequest } from '../middleware/auth.js';

/** POST /api/guardian/compare — body: { repoFullName, swagger } */
export async function compareGuardian(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = String(req.body?.repoFullName ?? '').trim();
    const swagger = req.body?.swagger;

    if (!repoFullName) {
      throw new HttpError(400, 'missing_repo', 'Body must include repoFullName.');
    }
    if (swagger === undefined || swagger === null) {
      throw new HttpError(400, 'missing_swagger', 'Body must include swagger JSON.');
    }
    parseFullName(repoFullName);
    assertRepoConnected(repoFullName, req.user?.selectedRepos ?? []);

    const report = await runGuardianCompare({ repoFullName, swagger });
    sendOk(res, { report });
  } catch (err) {
    next(err);
  }
}

/** GET /api/guardian/:owner/:repo — last cached report */
export async function getGuardianReport(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const fullName = `${owner}/${repo}`;
    parseFullName(fullName);
    assertRepoConnected(fullName, req.user?.selectedRepos ?? []);

    const report = getCachedGuardianReport(fullName);
    if (!report) {
      throw new HttpError(
        404,
        'report_not_found',
        'No guardian report cached. POST /api/guardian/compare first.',
      );
    }
    sendOk(res, { report });
  } catch (err) {
    next(err);
  }
}
