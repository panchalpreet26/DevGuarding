import type { ChatHistoryTurn, ChatStreamEvent } from '@devguardian/shared';
import { buildChatContext } from './contextBuilder.js';
import { getChatModel, getOpenAI } from './openaiClient.js';
import { logger } from '../../utils/logger.js';

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

function buildInput(
  contextText: string,
  question: string,
  history: ChatHistoryTurn[] = [],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const turns: Array<{ role: 'user' | 'assistant'; content: string }> = [
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
    turns.push({ role: turn.role, content: turn.content });
  }

  turns.push({ role: 'user', content: question });
  return turns;
}

/**
 * Stream a grounded answer. Strong engineering-memory matches short-circuit OpenAI.
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

  const openai = getOpenAI();
  const input = buildInput(ctx.contextText, question, history);

  const stream = await openai.responses.create({
    model: getChatModel(),
    instructions: SYSTEM_INSTRUCTIONS,
    input,
    stream: true,
  });

  let answer = '';

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      const text = event.delta;
      if (!text) continue;
      answer += text;
      yield { type: 'delta', text };
    }
  }

  yield {
    type: 'done',
    answer,
    unknown: looksUnknown(answer),
  };
}
