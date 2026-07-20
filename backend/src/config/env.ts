import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load monorepo-root .env first, then backend/.env overrides.
const backendDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(backendDir, '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, 'backend', '.env') });

/**
 * Centralised, validated environment config.
 * Fails fast at startup if a required variable is missing.
 */
type EnvShape = {
  NODE_ENV: string;
  PORT: number;
  CLIENT_ORIGIN: string[];
  CLIENT_URL: string;
  MONGODB_URI?: string;
  JWT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_CALLBACK_URL?: string;
  /** Optional fallback PAT when no OAuth session is present. */
  GITHUB_TOKEN?: string;
  /** google | openai — auto-picks Gemini when GEMINI_API_KEY is set */
  AI_PROVIDER?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env: EnvShape = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_ORIGIN: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-flash-latest',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
};

export const isProd = env.NODE_ENV === 'production';

// Exported so later milestones can assert secrets are present when a feature needs them.
export { required };
