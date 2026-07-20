import type { ChatHistoryTurn, ChatStreamEvent } from '@devguardian/shared';
import { buildChatContext } from './contextBuilder.js';
import { getChatModel, getLlmClient } from './openaiClient.js';
import { logger } from '../../utils/logger.js';
import { HttpError } from '../../utils/http.js';

const SYSTEM_INSTRUCTIONS = `You are DevGuardian AI, an engineering assistant that answers ONLY using the provided repository context.

Rules:
1. Engineering Memory entries are human-verified. If they answer the question, use them first and cite "engineering-memory".
2. Otherwise ground claims in README, folder structure, services, and routes.
3. Prefer citing file paths when explaining where something lives.
4. Use markdown. Use fenced code blocks with language tags for code.
5. If the context is insufficient, reply exactly starting with: "I don't know this yet."
   Then briefly say what is missing. Do not invent APIs, files, or architecture.
6. For follow-up questions, use prior conversation plus the fresh context.
7. Be concise and practical — staff-engineer tone.`;

function looksUnknown(answer: string): boolean {
  return /^i don't know this yet/i.test(answer.trim());
}

function buildMessages(
  contextText: string,
  question: string,
  history: ChatHistoryTurn[] = [],
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_INSTRUCTIONS },
    {
      role: 'user',
      content: `Repository context:\n\n${contextText}`,
    },
    {
      role: 'assistant',
      content:
        'I have the repository context and engineering memory. I will prefer memory when relevant, otherwise answer from repo files, and say "I don\'t know this yet." when insufficient.',
    },
  ];

  for (const turn of history.slice(-8)) {
    messages.push({ role: turn.role, content: turn.content });
  }

  messages.push({ role: 'user', content: question });
  return messages;
}

/**
 * Stream a grounded answer. Strong engineering-memory matches short-circuit the model.
 * Uses chat.completions so Gemini (OpenAI-compat) and OpenAI both work.
 */
export async function* streamRepoChat(params: {
  repoFullName: string;
  question: string;
  history?: ChatHistoryTurn[];
}): AsyncGenerator<ChatStreamEvent> {
  const { repoFullName, question, history = [] } = params;

  logger.info('Building chat context', { repo: repoFullName });
  const ctx = await buildChatContext(repoFullName, question);

  yield {
    type: 'meta',
    citations: ctx.citations,
    knowledgeHits: ctx.knowledgeHits.length,
  };

  // High-confidence memory hit — answer from memory first (no model call).
  if (ctx.strongMatch) {
    const answer =
      `${ctx.strongMatch.answer}\n\n` +
      `_From engineering memory (saved by ${ctx.strongMatch.createdBy})._`;
    yield { type: 'delta', text: answer };
    yield {
      type: 'done',
      answer,
      unknown: false,
    };
    return;
  }

  const client = getLlmClient();
  const messages = buildMessages(ctx.contextText, question, history);
  const model = getChatModel();

  let stream;
  try {
    stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    const raw = err instanceof Error ? err.message : String(err);
    if (status === 429 || /\b429\b/.test(raw)) {
      throw new HttpError(
        429,
        'llm_rate_limited',
        `AI rate limit hit for model "${model}". Wait ~1 minute and retry, or set GEMINI_MODEL=gemini-2.5-flash (or gemini-1.5-flash) in .env / Render. Free-tier quota: https://ai.google.dev/gemini-api/docs/rate-limits`,
      );
    }
    throw err;
  }

  let answer = '';

  try {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (!text) continue;
      answer += text;
      yield { type: 'delta', text };
    }
  } catch (err) {
    const status = (err as { status?: number }).status;
    const raw = err instanceof Error ? err.message : String(err);
    if (status === 429 || /\b429\b/.test(raw)) {
      throw new HttpError(
        429,
        'llm_rate_limited',
        `AI rate limit hit mid-stream for "${model}". Wait and retry, or switch GEMINI_MODEL.`,
      );
    }
    throw err;
  }

  yield {
    type: 'done',
    answer,
    unknown: looksUnknown(answer),
  };
}
