import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http.js';
import { clearAccessToken } from '../auth/userStore.js';
import { revokeAllSessionsForUser } from '../auth/session.js';
import { listInstallationRepos, resolveTokenForRepo } from '../auth/githubApp.js';
import { logger } from '../../utils/logger.js';

const GITHUB_API = 'https://api.github.com';

/** Per-request GitHub token (from OAuth session). Falls back to env.GITHUB_TOKEN. */
export const githubTokenStore = new AsyncLocalStorage<{
  token?: string;
  userId?: string;
}>();

export type GitHubTreeItem = {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
};

type GitHubRepoJson = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  language: string | null;
  html_url: string;
  updated_at: string;
};

type GitHubContentFile = {
  type: 'file';
  encoding: string;
  content: string;
  path: string;
  size: number;
};

function resolveToken(explicit?: string): string | undefined {
  return explicit ?? githubTokenStore.getStore()?.token ?? env.GITHUB_TOKEN;
}

async function handleGithubAuthFailure(status: number, body: string): Promise<never> {
  const store = githubTokenStore.getStore();
  if (store?.userId && status === 401) {
    try {
      await clearAccessToken(store.userId);
      await revokeAllSessionsForUser(store.userId);
      logger.warn('Cleared GitHub token and sessions after 401', { userId: store.userId });
    } catch (err) {
      logger.error('Failed to clear token after GitHub 401', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new HttpError(
    401,
    'github_auth_failed',
    'GitHub rejected the request. Sign in with GitHub again to refresh access.',
    { status, body: body.slice(0, 200) },
  );
}

async function githubFetch<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DevGuardian-AI',
    ...(init.headers as Record<string, string> | undefined),
  };

  const token = resolveToken(accessToken);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${GITHUB_API}${path}`, { ...init, headers });
  } catch (err) {
    throw new HttpError(
      502,
      'github_network_error',
      'Could not reach GitHub API. Check your network connection.',
      { error: err instanceof Error ? err.message : String(err) },
    );
  }

  if (res.status === 404) {
    throw new HttpError(404, 'github_not_found', `GitHub resource not found: ${path}`);
  }
  if (res.status === 401) {
    const body = await res.text();
    await handleGithubAuthFailure(res.status, body);
  }
  if (res.status === 403) {
    const body = await res.text();
    throw new HttpError(
      403,
      'github_forbidden',
      'GitHub denied access to this resource. Check repository permissions or re-authorize with the repo scope.',
      { body: body.slice(0, 200) },
    );
  }
  // Empty repos (and some unavailable git DBs) return 409 on tree/blob endpoints.
  if (res.status === 409) {
    const body = await res.text();
    throw new HttpError(
      409,
      'github_repo_empty',
      'This GitHub repository is empty (no commits yet). Push at least one commit, then retry analysis.',
      { body: body.slice(0, 300) },
    );
  }
  if (!res.ok) {
    const body = await res.text();
    const status = res.status >= 500 ? 502 : res.status;
    throw new HttpError(status, 'github_error', `GitHub API error ${res.status}`, {
      body: body.slice(0, 300),
    });
  }

  return (await res.json()) as T;
}

/** Map GitHub repo JSON → shared Repository DTO fields we need. */
export function mapRepo(raw: GitHubRepoJson) {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    private: raw.private,
    description: raw.description,
    defaultBranch: raw.default_branch,
    language: raw.language,
    htmlUrl: raw.html_url,
    updatedAt: raw.updated_at,
  };
}

export async function getRepo(owner: string, repo: string, accessToken?: string) {
  const token =
    accessToken ??
    (await resolveTokenForRepo(owner, githubTokenStore.getStore()?.token)) ??
    resolveToken();
  return mapRepo(await githubFetch<GitHubRepoJson>(`/repos/${owner}/${repo}`, {}, token));
}

/**
 * List repositories the signed-in user can access (public + private, personal + org).
 */
export async function listAccessibleUserRepos(accessToken?: string, perPage = 100) {
  const token = resolveToken(accessToken);
  if (!token) {
    throw new HttpError(
      401,
      'github_token_required',
      'Sign in with GitHub to list your repositories.',
    );
  }

  const raw = await githubFetch<GitHubRepoJson[]>(
    `/user/repos?per_page=${perPage}&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member`,
    {},
    token,
  );
  return raw.map(mapRepo);
}

/** @deprecated Use listAccessibleUserRepos — kept name alias for older imports. */
export const listPublicUserRepos = listAccessibleUserRepos;

/** List repos the user has connected for DevGuardian. */
export async function listUserRepos(
  accessToken: string | undefined,
  selectedFullNames: string[],
  perPage = 100,
) {
  if (!selectedFullNames.length) return [];

  const allowed = new Set(selectedFullNames.map((n) => n.toLowerCase()));
  const [accessible, installRepos] = await Promise.all([
    listAccessibleUserRepos(accessToken, perPage).catch(() => []),
    listInstallationRepos().catch(() => []),
  ]);

  const merged = new Map<string, ReturnType<typeof mapRepo>>();
  for (const repo of [...accessible, ...installRepos]) {
    if (allowed.has(repo.fullName.toLowerCase())) {
      merged.set(repo.fullName.toLowerCase(), repo);
    }
  }
  return [...merged.values()];
}

/** Ensure fullName is in the user's connected set. */
export function assertRepoConnected(fullName: string, selectedFullNames: string[]): void {
  const ok = selectedFullNames.some(
    (name) => name.toLowerCase() === fullName.trim().toLowerCase(),
  );
  if (!ok) {
    throw new HttpError(
      403,
      'repo_not_connected',
      'This repository is not connected. Open Select repositories and add it first.',
    );
  }
}

/** Recursive file tree for the default (or given) branch. */
export async function getRepoTree(owner: string, repo: string, ref: string) {
  try {
    const token = await resolveTokenForRepo(owner, githubTokenStore.getStore()?.token);
    return await githubFetch<{ tree: GitHubTreeItem[]; truncated: boolean }>(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      {},
      token,
    );
  } catch (err) {
    // Empty / uninitialized repos cannot expose a tree — return empty so analysis can continue.
    if (err instanceof HttpError && err.code === 'github_repo_empty') {
      return { tree: [] as GitHubTreeItem[], truncated: false };
    }
    throw err;
  }
}

/** Read a text file from the repo. Returns null if missing. */
export async function getFileContent(
  owner: string,
  repo: string,
  filePath: string,
  ref: string,
): Promise<string | null> {
  try {
    const token = await resolveTokenForRepo(owner, githubTokenStore.getStore()?.token);
    const data = await githubFetch<GitHubContentFile>(
      `/repos/${owner}/${repo}/contents/${filePath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}?ref=${encodeURIComponent(ref)}`,
      {},
      token,
    );
    if (data.encoding !== 'base64') return null;
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (err) {
    if (err instanceof HttpError && err.code === 'github_not_found') return null;
    throw err;
  }
}

/** Fetch multiple files with a concurrency limit. */
export async function getFilesContent(
  owner: string,
  repo: string,
  paths: string[],
  ref: string,
  concurrency = 6,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let index = 0;

  async function worker(): Promise<void> {
    while (index < paths.length) {
      const current = paths[index++];
      if (!current) continue;
      const content = await getFileContent(owner, repo, current, ref);
      if (content !== null) out.set(current, content);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, () => worker()));
  return out;
}

export function parseFullName(fullName: string): { owner: string; repo: string } {
  const parts = fullName.trim().replace(/^https?:\/\/github\.com\//, '').split('/');
  const owner = parts[0];
  const repo = parts[1]?.replace(/\.git$/, '');
  if (!owner || !repo || parts.length !== 2) {
    throw new HttpError(400, 'invalid_repo', 'Repository must be in owner/repo format.');
  }
  return { owner, repo };
}
