import type { GuardianReport } from '@devguardian/shared';
import {
  analyzeRepository,
  getCachedAnalysis,
} from '../analysis/index.js';
import {
  getFileContent,
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
import { extractClientCalls, isLikelyClientPath } from './extractClientCalls.js';
import { compareClientsToCode } from './compareClients.js';
import { buildDraftOpenApi } from './buildDraftOpenApi.js';
import { HttpError } from '../../utils/http.js';
import { logger } from '../../utils/logger.js';

const reportCache = new Map<string, GuardianReport>();

export function getCachedGuardianReport(repoFullName: string): GuardianReport | undefined {
  return reportCache.get(repoFullName.toLowerCase());
}

async function loadRepoSources(repoFullName: string) {
  const { owner, repo } = parseFullName(repoFullName);

  let analysis = getCachedAnalysis(repoFullName);
  if (!analysis) {
    analysis = await analyzeRepository(repoFullName);
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
  const uniqueRoutes = [...new Set(routePaths)].slice(0, 50);
  const routeSources = await getFilesContent(owner, repo, uniqueRoutes, meta.defaultBranch);

  const extracted = extractEndpoints(routeSources);
  const codeEndpoints =
    extracted.length > 0
      ? extracted
      : analysis.endpoints.map((e) => ({
          ...e,
          path: normalizePath(e.path),
        }));

  return {
    owner,
    repo,
    meta,
    analysis,
    blobPaths,
    classified,
    routeSources,
    codeEndpoints,
  };
}

/**
 * Compare uploaded Swagger/OpenAPI JSON against repository routes.
 */
export async function runGuardianCompare(input: {
  repoFullName: string;
  swagger: unknown;
}): Promise<GuardianReport> {
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

  const { analysis, routeSources, codeEndpoints } = await loadRepoSources(input.repoFullName);

  logger.info('API Guardian compare', {
    repo: analysis.repoFullName,
    spec: spec.length,
    code: codeEndpoints.length,
  });

  const findings = compareSpecToCode({
    spec,
    code: codeEndpoints,
    sources: routeSources,
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

/**
 * No-Swagger mode: compare frontend fetch/axios/api calls to backend routes.
 */
export async function runGuardianClientScan(input: {
  repoFullName: string;
}): Promise<GuardianReport> {
  const { owner, repo, meta, analysis, blobPaths, codeEndpoints } = await loadRepoSources(
    input.repoFullName,
  );

  const clientPaths = blobPaths.filter(isLikelyClientPath).slice(0, 80);
  const clientSources = await getFilesContent(owner, repo, clientPaths, meta.defaultBranch);
  const clients = extractClientCalls(clientSources);

  if (clients.length === 0 && codeEndpoints.length === 0) {
    throw new HttpError(
      400,
      'nothing_to_scan',
      'No frontend API calls or backend routes were found. Try uploading Swagger, or ensure the repo has routes and client fetch/axios calls.',
    );
  }

  logger.info('API Guardian client scan', {
    repo: analysis.repoFullName,
    clients: clients.length,
    code: codeEndpoints.length,
  });

  const findings = compareClientsToCode({ clients, code: codeEndpoints });
  const counts = summarizeFindings(findings);
  const matched = clients.filter((c) =>
    codeEndpoints.some(
      (e) =>
        e.method.toUpperCase() === c.method.toUpperCase() &&
        normalizePath(e.path) === normalizePath(c.path),
    ),
  ).length;

  const report: GuardianReport = {
    repoFullName: analysis.repoFullName,
    findings,
    summary: {
      ...counts,
      specEndpoints: clients.length,
      codeEndpoints: codeEndpoints.length,
      matched,
    },
    specEndpoints: clients.map((c) => ({
      method: c.method,
      path: c.path,
      requestFields: [],
      responseFields: [],
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

/** Generate downloadable OpenAPI draft from backend routes. */
export async function runDraftOpenApi(repoFullName: string): Promise<{
  openapi: Record<string, unknown>;
  endpointCount: number;
}> {
  const { analysis, codeEndpoints } = await loadRepoSources(repoFullName);
  if (codeEndpoints.length === 0) {
    throw new HttpError(
      400,
      'no_routes',
      'No backend routes found to generate a draft OpenAPI document.',
    );
  }

  return {
    openapi: buildDraftOpenApi({
      repoFullName: analysis.repoFullName,
      endpoints: codeEndpoints,
    }),
    endpointCount: codeEndpoints.length,
  };
}

/**
 * If the repo already contains openapi/swagger JSON, load and compare it
 * (no manual upload needed).
 */
export async function runGuardianFromRepoSpec(repoFullName: string): Promise<GuardianReport> {
  const { owner, repo, meta, classified } = await loadRepoSources(repoFullName);
  const candidate =
    classified.openApi.find((p) => /\.json$/i.test(p)) ?? classified.openApi[0];

  if (!candidate) {
    throw new HttpError(
      404,
      'no_repo_swagger',
      'No OpenAPI/Swagger file found in the repository. Upload one, scan frontend↔backend, or download a draft OpenAPI from routes.',
    );
  }

  const raw = await getFileContent(owner, repo, candidate, meta.defaultBranch);
  if (!raw) {
    throw new HttpError(404, 'no_repo_swagger', `Could not read ${candidate} from the repository.`);
  }

  let swagger: unknown = raw;
  if (candidate.endsWith('.json')) {
    try {
      swagger = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'invalid_swagger', `${candidate} is not valid JSON.`);
    }
  } else {
    throw new HttpError(
      400,
      'yaml_not_supported',
      'YAML OpenAPI in-repo is not supported yet. Convert to JSON or upload JSON manually.',
    );
  }

  return runGuardianCompare({ repoFullName, swagger });
}
