import type { RepositoryAnalysis } from '@devguardian/shared';
import {
  getFileContent,
  getFilesContent,
  getRepo,
  getRepoTree,
  parseFullName,
  type GitHubTreeItem,
} from '../github/client.js';
import { analyzePackages } from './packageAnalyzer.js';
import { extractEndpoints } from './routeExtractor.js';
import { detectAuthFlow } from './authFlowDetector.js';
import { buildFolderTree, classifySourcePaths } from './treeBuilder.js';
import { buildArchitectureDiagram, buildProjectSummary } from './summaryBuilder.js';
import { logger } from '../../utils/logger.js';

// ponytail: in-memory cache is enough until MongoDB persistence (ceil: single-process; upgrade: models/Analysis)
const cache = new Map<string, RepositoryAnalysis>();

const MAX_SOURCE_BYTES = 120_000;

function truncate(content: string): string {
  if (content.length <= MAX_SOURCE_BYTES) return content;
  return content.slice(0, MAX_SOURCE_BYTES);
}

function readmeExcerpt(raw: string | null): string | null {
  if (!raw) return null;
  return raw.slice(0, 4000);
}

export function getCachedAnalysis(fullName: string): RepositoryAnalysis | undefined {
  return cache.get(fullName.toLowerCase());
}

export function clearAnalysisCache(fullName?: string): void {
  if (fullName) cache.delete(fullName.toLowerCase());
  else cache.clear();
}

/** Full repository analysis pipeline. */
export async function analyzeRepository(fullName: string): Promise<RepositoryAnalysis> {
  const { owner, repo } = parseFullName(fullName);
  const meta = await getRepo(owner, repo);
  const key = meta.fullName.toLowerCase();

  logger.info('Starting repository analysis', { repo: meta.fullName });

  const { tree: flatTree } = await getRepoTree(owner, repo, meta.defaultBranch);
  if (flatTree.length === 0) {
    logger.warn('Repository tree is empty — returning minimal analysis', {
      repo: meta.fullName,
    });
    const empty: RepositoryAnalysis = {
      repoFullName: meta.fullName,
      summary:
        'This repository has no commits yet (empty Git tree). Push code to GitHub, then re-run analysis.',
      techStack: meta.language ? [meta.language] : [],
      frameworks: [],
      database: null,
      folderTree: { name: meta.name, path: '', type: 'dir', children: [] },
      endpoints: [],
      authFlow: 'No code available to detect authentication.',
      architectureDiagram: 'Empty repository — no architecture to diagram yet.',
      analyzedAt: new Date().toISOString(),
    };
    cache.set(key, empty);
    return empty;
  }

  const blobPaths = flatTree.filter((t: GitHubTreeItem) => t.type === 'blob').map((t) => t.path);

  const classified = classifySourcePaths(blobPaths);
  const folderTree = buildFolderTree(flatTree, meta.name);

  // Fetch package.json files + README + layered source files
  const toFetch = [
    ...classified.packageJson,
    ...(classified.readme ? [classified.readme] : []),
    ...classified.routes,
    ...classified.controllers,
    ...classified.services,
    ...classified.middlewares,
    ...classified.models.slice(0, 15),
  ];
  const uniquePaths = [...new Set(toFetch)];

  const fileMap = await getFilesContent(owner, repo, uniquePaths, meta.defaultBranch);
  const truncated = new Map<string, string>();
  for (const [p, c] of fileMap) truncated.set(p, truncate(c));

  const packageFiles = new Map<string, string>();
  for (const p of classified.packageJson) {
    const c = truncated.get(p);
    if (c) packageFiles.set(p, c);
  }

  // Fallback: try root package.json if classifier missed (unlikely)
  if (packageFiles.size === 0) {
    const rootPkg = await getFileContent(owner, repo, 'package.json', meta.defaultBranch);
    if (rootPkg) packageFiles.set('package.json', rootPkg);
  }

  const pkg = analyzePackages(packageFiles);

  const routeFiles = new Map<string, string>();
  for (const p of [...classified.routes, ...classified.controllers]) {
    const c = truncated.get(p);
    if (c) routeFiles.set(p, c);
  }
  const endpoints = extractEndpoints(routeFiles);

  const auth = detectAuthFlow(truncated, classified.middlewares, blobPaths);

  const readmeRaw = classified.readme ? (truncated.get(classified.readme) ?? null) : null;

  const hasFrontend = pkg.frameworks.some((f) =>
    ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Vite'].includes(f),
  );
  const hasBackend = pkg.frameworks.some((f) =>
    ['Express', 'NestJS', 'Fastify', 'Koa', 'Hono'].includes(f),
  );

  const summary = buildProjectSummary({
    repoFullName: meta.fullName,
    description: meta.description,
    readmeExcerpt: readmeExcerpt(readmeRaw),
    pkg,
    endpoints,
    auth,
    tree: folderTree,
    layers: {
      routes: classified.routes,
      controllers: classified.controllers,
      services: classified.services,
      middlewares: classified.middlewares,
      models: classified.models,
    },
  });

  const analysis: RepositoryAnalysis = {
    repoFullName: meta.fullName,
    summary,
    techStack: pkg.techStack.length
      ? pkg.techStack
      : meta.language
        ? [meta.language]
        : [],
    frameworks: pkg.frameworks,
    database: pkg.database,
    folderTree,
    endpoints,
    authFlow: auth.narrative,
    architectureDiagram: buildArchitectureDiagram({
      frameworks: pkg.frameworks,
      database: pkg.database,
      hasFrontend,
      hasBackend: hasBackend || classified.routes.length > 0,
    }),
    analyzedAt: new Date().toISOString(),
  };

  cache.set(key, analysis);
  logger.info('Repository analysis complete', {
    repo: meta.fullName,
    endpoints: endpoints.length,
    techStack: analysis.techStack.length,
  });

  return analysis;
}
