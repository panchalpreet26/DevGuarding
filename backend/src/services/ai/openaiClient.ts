import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http.js';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new HttpError(
      503,
      'openai_not_configured',
      'OPENAI_API_KEY is not set. Add it to .env to enable AI chat.',
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export function getChatModel(): string {
  return env.OPENAI_MODEL;
}
