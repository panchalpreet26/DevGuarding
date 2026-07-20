import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { isMongoConnected } from '../../config/db.js';
import { GithubInstallationModel } from '../../models/GithubInstallation.js';
import { HttpError } from '../../utils/http.js';

const GITHUB_API = 'https://api.github.com';

export function isGithubAppConfigured(): boolean {
  return Boolean(
    env.GITHUB_APP_ID &&
      env.GITHUB_APP_PRIVATE_KEY &&
      env.GITHUB_APP_SLUG &&
      !env.GITHUB_APP_ID.startsWith('your_'),
  );
}

function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

function requireAppConfig(): { appId: string; privateKey: string; slug: string } {
  if (!isGithubAppConfigured()) {
    throw new HttpError(
      503,
      'github_app_not_configured',
      'GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_APP_SLUG.',
    );
  }
  return {
    appId: env.GITHUB_APP_ID!,
    privateKey: normalizePem(env.GITHUB_APP_PRIVATE_KEY!),
    slug: env.GITHUB_APP_SLUG!,
  };
}

/** Short-lived JWT asserting this process is the GitHub App. */
export function createAppJwt(): string {
  const { appId, privateKey } = requireAppConfig();
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    },
    privateKey,
    { algorithm: 'RS256' },
  );
}

export function buildGithubAppInstallUrl(): string {
  const { slug } = requireAppConfig();
  return `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`;
}

type InstallationAccount = {
  login: string;
  id: number;
  type: 'Organization' | 'User';
};

export async function fetchInstallationAccount(
  installationId: number,
): Promise<InstallationAccount> {
  const appJwt = createAppJwt();
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${appJwt}`,
      'User-Agent': 'DevGuardian-AI',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    throw new HttpError(502, 'github_app_install_failed', 'Failed to load GitHub App installation.');
  }

  const raw = (await res.json()) as {
    account: { login: string; id: number; type: string };
  };

  const type = raw.account.type === 'Organization' ? 'Organization' : 'User';
  return { login: raw.account.login, id: raw.account.id, type };
}

export async function createInstallationAccessToken(installationId: number): Promise<string> {
  const appJwt = createAppJwt();
  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${appJwt}`,
        'User-Agent': 'DevGuardian-AI',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!res.ok) {
    throw new HttpError(
      502,
      'github_app_token_failed',
      'Failed to mint GitHub App installation token.',
    );
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new HttpError(502, 'github_app_token_failed', 'Installation token missing in response.');
  }
  return data.token;
}

export async function upsertInstallation(input: {
  installationId: number;
  accountLogin: string;
  accountId: number;
  accountType: 'Organization' | 'User';
  installedByUserId: string;
}): Promise<void> {
  if (!isMongoConnected()) {
    throw new HttpError(503, 'mongo_required', 'MongoDB is required for GitHub App installs.');
  }

  await GithubInstallationModel.findOneAndUpdate(
    { installationId: input.installationId },
    {
      accountLogin: input.accountLogin,
      accountId: input.accountId,
      accountType: input.accountType,
      installedByUserId: input.installedByUserId,
    },
    { upsert: true, new: true },
  ).exec();
}

export async function findInstallationForOwner(owner: string) {
  if (!isMongoConnected()) return null;
  return GithubInstallationModel.findOne({
    accountLogin: new RegExp(`^${escapeRegex(owner)}$`, 'i'),
  }).exec();
}

export async function listInstallationRepos() {
  if (!isMongoConnected() || !isGithubAppConfigured()) return [];

  const installs = await GithubInstallationModel.find().exec();
  const repos: Array<{
    id: number;
    name: string;
    fullName: string;
    private: boolean;
    description: string | null;
    defaultBranch: string;
    language: string | null;
    htmlUrl: string;
    updatedAt: string;
  }> = [];

  for (const install of installs) {
    const token = await createInstallationAccessToken(install.installationId);
    let page = 1;
    // Bound pages so a huge org cannot hang the request forever.
    while (page <= 5) {
      const res = await fetch(
        `${GITHUB_API}/installation/repositories?per_page=100&page=${page}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'DevGuardian-AI',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      if (!res.ok) break;
      const body = (await res.json()) as {
        repositories: Array<{
          id: number;
          name: string;
          full_name: string;
          private: boolean;
          description: string | null;
          default_branch: string;
          language: string | null;
          html_url: string;
          updated_at: string;
        }>;
        total_count: number;
      };
      for (const raw of body.repositories) {
        repos.push({
          id: raw.id,
          name: raw.name,
          fullName: raw.full_name,
          private: raw.private,
          description: raw.description,
          defaultBranch: raw.default_branch,
          language: raw.language,
          htmlUrl: raw.html_url,
          updatedAt: raw.updated_at,
        });
      }
      if (repos.length >= body.total_count || body.repositories.length < 100) break;
      page += 1;
    }
  }

  return repos;
}

/** Prefer installation token for owners covered by a GitHub App install. */
export async function resolveTokenForRepo(
  owner: string,
  oauthToken: string | undefined,
): Promise<string | undefined> {
  if (!isGithubAppConfigured()) return oauthToken;

  const install = await findInstallationForOwner(owner);
  if (!install) return oauthToken;

  try {
    return await createInstallationAccessToken(install.installationId);
  } catch {
    return oauthToken;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
