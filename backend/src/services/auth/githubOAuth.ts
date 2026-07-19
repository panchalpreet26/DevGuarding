import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http.js';

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

const SCOPES = ['read:user', 'user:email', 'public_repo'].join(' ');

function requireOAuthConfig(): { clientId: string; clientSecret: string; callbackUrl: string } {
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  const callbackUrl =
    env.GITHUB_CALLBACK_URL ?? 'http://localhost:4000/api/auth/github/callback';

  if (
    !clientId ||
    !clientSecret ||
    clientId.startsWith('your_') ||
    clientSecret.startsWith('your_')
  ) {
    throw new HttpError(
      503,
      'oauth_not_configured',
      'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env (create an OAuth App at https://github.com/settings/developers).',
    );
  }

  return { clientId, clientSecret, callbackUrl };
}

export function buildGithubAuthorizeUrl(state: string): string {
  const { clientId, callbackUrl } = requireOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: SCOPES,
    state,
  });
  return `${GITHUB_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const { clientId, clientSecret, callbackUrl } = requireOAuthConfig();

  const res = await fetch(GITHUB_TOKEN, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'DevGuardian-AI',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  if (!res.ok) {
    throw new HttpError(502, 'oauth_exchange_failed', 'GitHub token exchange failed.');
  }

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new HttpError(
      401,
      'oauth_exchange_failed',
      data.error_description || data.error || 'GitHub did not return an access token.',
    );
  }

  return data.access_token;
}

export type GithubProfile = {
  githubId: number;
  username: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
};

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'DevGuardian-AI',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    throw new HttpError(502, 'github_profile_failed', 'Failed to load GitHub profile.');
  }

  const raw = (await res.json()) as {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
  };

  let email = raw.email;
  if (!email) {
    email = await fetchPrimaryEmail(accessToken);
  }

  return {
    githubId: raw.id,
    username: raw.login,
    name: raw.name,
    email,
    avatarUrl: raw.avatar_url,
  };
}

async function fetchPrimaryEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/user/emails`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'DevGuardian-AI',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return null;
    const emails = (await res.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
    return primary?.email ?? null;
  } catch {
    return null;
  }
}
