import type { Request, Response, NextFunction } from 'express';
import type { ChatHistoryTurn, ChatStreamEvent } from '@devguardian/shared';
import { streamRepoChat } from '../services/ai/chatService.js';
import { assertRepoConnected, parseFullName } from '../services/github/client.js';
import { HttpError, sendOk } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import type { AuthedRequest } from '../middleware/auth.js';

function parseHistory(raw: unknown): ChatHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is ChatHistoryTurn =>
        typeof item === 'object' &&
        item !== null &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string',
    )
    .map((item) => ({ role: item.role, content: item.content.slice(0, 8_000) }))
    .slice(-8);
}

function writeSse(res: Response, event: ChatStreamEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/** POST /api/chat/stream — SSE grounded chat. */
export async function streamChat(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const fullName =
      typeof req.body?.repoFullName === 'string' ? req.body.repoFullName.trim() : '';
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';

    if (!fullName || !question) {
      throw new HttpError(
        400,
        'invalid_chat_request',
        'Body must include repoFullName and question.',
      );
    }
    parseFullName(fullName);
    assertRepoConnected(fullName, req.user?.selectedRepos ?? []);

    const history = parseHistory(req.body?.history);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for await (const event of streamRepoChat({
      repoFullName: fullName,
      question,
      history,
    })) {
      writeSse(res, event);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (res.headersSent) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      logger.error('Chat stream failed after headers sent', { message });
      writeSse(res, { type: 'error', message });
      res.end();
      return;
    }
    next(err);
  }
}

/** POST /api/chat — non-streaming convenience (collects the stream). */
export async function chatOnce(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const fullName =
      typeof req.body?.repoFullName === 'string' ? req.body.repoFullName.trim() : '';
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!fullName || !question) {
      throw new HttpError(
        400,
        'invalid_chat_request',
        'Body must include repoFullName and question.',
      );
    }
    parseFullName(fullName);
    assertRepoConnected(fullName, req.user?.selectedRepos ?? []);

    let citations: string[] = [];
    let answer = '';
    let unknown = false;

    for await (const event of streamRepoChat({
      repoFullName: fullName,
      question,
      history: parseHistory(req.body?.history),
    })) {
      if (event.type === 'meta') citations = event.citations;
      if (event.type === 'delta') answer += event.text;
      if (event.type === 'done') {
        answer = event.answer || answer;
        unknown = event.unknown;
      }
      if (event.type === 'error') throw new HttpError(502, 'chat_failed', event.message);
    }

    sendOk(res, { answer, citations, unknown });
  } catch (err) {
    next(err);
  }
}
