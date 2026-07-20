import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http.js';

export type LlmProvider = 'gemini' | 'openai';

let client: OpenAI | null = null;
let clientProvider: LlmProvider | null = null;

/** Prefer Gemini when GEMINI_API_KEY is set (free demo); else OpenAI. */
export function getLlmProvider(): LlmProvider {
  if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) return 'openai';
  if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) return 'gemini';
  if (env.GEMINI_API_KEY) return 'gemini';
  if (env.OPENAI_API_KEY) return 'openai';
  throw new HttpError(
    503,
    'llm_not_configured',
    'No AI key configured. Set GEMINI_API_KEY (free) or OPENAI_API_KEY in .env / Render.',
  );
}

/**
 * OpenAI SDK client.
 * Gemini uses Google's OpenAI-compatible endpoint so we keep one streaming path.
 */
export function getLlmClient(): OpenAI {
  const provider = getLlmProvider();
  if (client && clientProvider === provider) return client;

  if (provider === 'gemini') {
    client = new OpenAI({
      apiKey: env.GEMINI_API_KEY!,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  } else {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY! });
  }
  clientProvider = provider;
  return client;
}

export function getChatModel(): string {
  const provider = getLlmProvider();
  if (provider === 'gemini') {
    return env.GEMINI_MODEL || 'gemini-2.5-flash';
  }
  return env.OPENAI_MODEL || 'gpt-4o-mini';
}

/** @deprecated use getLlmClient — kept so older imports do not break mid-refactor */
export function getOpenAI(): OpenAI {
  return getLlmClient();
}
