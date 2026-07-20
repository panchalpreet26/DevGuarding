import type { Response, NextFunction } from 'express';
import {
  getCachedGuardianReport,
  runDraftOpenApi,
  runGuardianClientScan,
  runGuardianCompare,
  runGuardianFromRepoSpec,
} from '../services/guardian/runGuardian.js';
import { assertRepoConnected, parseFullName } from '../services/github/client.js';
import { HttpError, sendOk } from '../utils/http.js';
import type { AuthedRequest } from '../middleware/auth.js';

function requireConnectedRepo(req: AuthedRequest, repoFullName: string): string {
  const name = repoFullName.trim();
  if (!name) {
    throw new HttpError(400, 'missing_repo', 'Body must include repoFullName.');
  }
  parseFullName(name);
  assertRepoConnected(name, req.user?.selectedRepos ?? []);
  return name;
}

/** POST /api/guardian/compare — body: { repoFullName, swagger } */
export async function compareGuardian(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = requireConnectedRepo(req, String(req.body?.repoFullName ?? ''));
    const swagger = req.body?.swagger;

    if (swagger === undefined || swagger === null) {
      throw new HttpError(400, 'missing_swagger', 'Body must include swagger JSON.');
    }

    const report = await runGuardianCompare({ repoFullName, swagger });
    sendOk(res, { report });
  } catch (err) {
    next(err);
  }
}

/** POST /api/guardian/scan-clients — no swagger; FE calls ↔ BE routes */
export async function scanClientsGuardian(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = requireConnectedRepo(req, String(req.body?.repoFullName ?? ''));
    const report = await runGuardianClientScan({ repoFullName });
    sendOk(res, { report, mode: 'client-vs-code' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/guardian/compare-repo-spec — use openapi/swagger file already in the repo */
export async function compareRepoSpecGuardian(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = requireConnectedRepo(req, String(req.body?.repoFullName ?? ''));
    const report = await runGuardianFromRepoSpec(repoFullName);
    sendOk(res, { report, mode: 'repo-spec' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/guardian/draft-openapi — generate OpenAPI JSON from backend routes */
export async function draftOpenApiGuardian(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = requireConnectedRepo(req, String(req.body?.repoFullName ?? ''));
    const result = await runDraftOpenApi(repoFullName);
    sendOk(res, result);
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
        'No guardian report cached. Run a compare or client scan first.',
      );
    }
    sendOk(res, { report });
  } catch (err) {
    next(err);
  }
}
