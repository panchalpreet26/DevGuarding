import type { GuardianReport } from '@devguardian/shared';
import {
  analyzeRepository,
  getCachedAnalysis,
} from '../analysis/index.js';
import {
  getFilesContent,
  getRepo,
  getRepoTree,
  parseFullName,
  type GitHubTreeItem,
} from '../github/client.js';
import { classifySourcePaths } from '../analysis/treeBuilder.js';
import { extractEndpoints } from '../analysis/routeExtractor.js';
import { normalizePath, parseOpenApiDocument } from './parseOpenApi.js';
import { compareSpecToCode, summarizeFindings } from './compare.js';
import { HttpError } from '../../utils/http.js';
import { logger } from '../../utils/logger.js';

const reportCache = new Map<string, GuardianReport>();

export function getCachedGuardianReport(repoFullName: string): GuardianReport | undefined {
  return reportCache.get(repoFullName.toLowerCase());
}

/**
 * Compare uploaded Swagger/OpenAPI JSON against repository routes.
 */
export async function runGuardianCompare(input: {
  repoFullName: string;
  swagger: unknown;
}): Promise<GuardianReport> {
  const { owner, repo } = parseFullName(input.repoFullName);

  let spec;
  try {
    spec = parseOpenApiDocument(input.swagger);
  } catch (err) {
    throw new HttpError(
      400,
      'invalid_swagger',
      err instanceof Error ? err.message : 'Failed to parse Swagger/OpenAPI JSON.',
    );
  }

  if (spec.length === 0) {
    throw new HttpError(400, 'empty_spec', 'OpenAPI document contains no path operations.');
  }

  let analysis = getCachedAnalysis(input.repoFullName);
  if (!analysis) {
    analysis = await analyzeRepository(input.repoFullName);
  }

  const meta = await getRepo(owner, repo);
  const { tree } = await getRepoTree(owner, repo, meta.defaultBranch);
  const blobPaths = tree.filter((t: GitHubTreeItem) => t.type === 'blob').map((t) => t.path);
  const classified = classifySourcePaths(blobPaths);

  const routePaths = [
    ...classified.routes,
    ...classified.controllers,
    ...classified.middlewares.slice(0, 10),
  ];
  const unique = [...new Set(routePaths)].slice(0, 50);
  const sources = await getFilesContent(owner, repo, unique, meta.defaultBranch);

  // Prefer freshly extracted endpoints from fetched sources; fall back to analysis cache.
  const extracted = extractEndpoints(sources);
  const codeEndpoints =
    extracted.length > 0
      ? extracted
      : analysis.endpoints.map((e) => ({
          ...e,
          path: normalizePath(e.path),
        }));

  logger.info('API Guardian compare', {
    repo: analysis.repoFullName,
    spec: spec.length,
    code: codeEndpoints.length,
  });

  const findings = compareSpecToCode({
    spec,
    code: codeEndpoints,
    sources,
  });

  const counts = summarizeFindings(findings);
  const matched = codeEndpoints.filter((c) =>
    spec.some(
      (s) =>
        s.method === c.method.toUpperCase() &&
        normalizePath(s.path) === normalizePath(c.path),
    ),
  ).length;

  const report: GuardianReport = {
    repoFullName: analysis.repoFullName,
    findings,
    summary: {
      ...counts,
      specEndpoints: spec.length,
      codeEndpoints: codeEndpoints.length,
      matched,
    },
    specEndpoints: spec.map((s) => ({
      method: s.method,
      path: s.rawPath,
      requestFields: s.requestFields.map((f) => f.name),
      responseFields: s.responseFields.map((f) => f.name),
    })),
    codeEndpoints: codeEndpoints.map((e) => ({
      method: e.method,
      path: e.path,
      file: e.file,
    })),
    checkedAt: new Date().toISOString(),
  };

  reportCache.set(analysis.repoFullName.toLowerCase(), report);
  return report;
}
