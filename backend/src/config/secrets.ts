import { env, isProd } from './env.js';

const PLACEHOLDER_SECRETS = new Set([
  '',
  'replace_me_with_a_long_random_string',
  'devguardian-dev-secret-change-me',
  'your_github_oauth_client_id',
  'your_github_oauth_client_secret',
]);

const DEV_FALLBACK_SECRET = 'devguardian-dev-secret-change-me';

export function isWeakSecret(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (PLACEHOLDER_SECRETS.has(trimmed)) return true;
  return trimmed.length < 16;
}

/** JWT signing secret — never use the dev fallback in production. */
export function jwtSecret(): string {
  if (!isWeakSecret(env.JWT_SECRET)) return env.JWT_SECRET!.trim();
  if (isProd) {
    throw new Error(
      'JWT_SECRET must be set to a strong random value in production (openssl rand -hex 32).',
    );
  }
  return DEV_FALLBACK_SECRET;
}

/** At-rest encryption key for GitHub tokens (ENCRYPTION_KEY or JWT_SECRET). */
export function encryptionSecret(): string {
  const candidate = env.ENCRYPTION_KEY?.trim() || env.JWT_SECRET?.trim();
  if (!isWeakSecret(candidate)) return candidate!;
  if (isProd) {
    throw new Error(
      'ENCRYPTION_KEY or JWT_SECRET must be a strong random value in production.',
    );
  }
  return DEV_FALLBACK_SECRET;
}

/** Call once at process boot before accepting traffic. */
export function assertBootSecrets(): void {
  if (!isProd) return;

  jwtSecret();
  encryptionSecret();

  if (isWeakSecret(env.GITHUB_CLIENT_ID) || isWeakSecret(env.GITHUB_CLIENT_SECRET)) {
    throw new Error(
      'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured in production.',
    );
  }
}
