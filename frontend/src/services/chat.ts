import type { ChatHistoryTurn, ChatStreamEvent } from '@devguardian/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/**
 * POST /api/chat/stream and yield parsed SSE events.
 */
export async function* streamChat(params: {
  repoFullName: string;
  question: string;
  history?: ChatHistoryTurn[];
  signal?: AbortSignal;
}): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoFullName: params.repoFullName,
      question: params.question,
      history: params.history ?? [],
    }),
    signal: params.signal,
  });

  if (!res.ok || !res.body) {
    let message = `Chat failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // ignore
    }
    yield { type: 'error', message };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.replace(/^data:\s*/, '');
      if (data === '[DONE]') return;
      try {
        yield JSON.parse(data) as ChatStreamEvent;
      } catch {
        // skip malformed
      }
    }
  }
}
