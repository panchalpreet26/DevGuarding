import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http.js';

const GITHUB_API = 'https://api.github.com';

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

async function githubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DevGuardian-AI',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`${GITHUB_API}${path}`, { ...init, headers });

  if (res.status === 404) {
    throw new HttpError(404, 'github_not_found', `GitHub resource not found: ${path}`);
  }
  if (res.status === 401 || res.status === 403) {
    const body = await res.text();
    throw new HttpError(
      401,
      'github_auth_failed',
      'GitHub API rejected the request. Set a valid GITHUB_TOKEN in .env.',
      { status: res.status, body: body.slice(0, 200) },
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new HttpError(502, 'github_error', `GitHub API error ${res.status}`, {
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

export async function getRepo(owner: string, repo: string) {
  return mapRepo(await githubFetch<GitHubRepoJson>(`/repos/${owner}/${repo}`));
}

export async function listUserRepos(perPage = 50) {
  if (!env.GITHUB_TOKEN) {
    throw new HttpError(
      400,
      'github_token_required',
      'GITHUB_TOKEN is required to list repositories. Add a PAT to .env.',
    );
  }

  const raw = await githubFetch<GitHubRepoJson[]>(
    `/user/repos?per_page=${perPage}&sort=updated&affiliation=owner,collaborator,organization_member`,
  );
  return raw.map(mapRepo);
}

/** Recursive file tree for the default (or given) branch. */
export async function getRepoTree(owner: string, repo: string, ref: string) {
  const data = await githubFetch<{ tree: GitHubTreeItem[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  );
  return data;
}

/** Read a text file from the repo. Returns null if missing. */
export async function getFileContent(
  owner: string,
  repo: string,
  filePath: string,
  ref: string,
): Promise<string | null> {
  try {
      const data = await githubFetch<GitHubContentFile>(
      `/repos/${owner}/${repo}/contents/${filePath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}?ref=${encodeURIComponent(ref)}`,
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
