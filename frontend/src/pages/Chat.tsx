import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { randomUUID } from '@/lib/id';
import type { ChatHistoryTurn, ChatMessage } from '@devguardian/shared';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRepo } from '@/context/RepoContext';
import { streamChat } from '@/services/chat';

const SUGGESTIONS = [
  'Where is authentication handled?',
  'Explain the request flow for the main API.',
  'Which files define routes and controllers?',
  'What happens if I modify a core model?',
];

export default function ChatPage() {
  const { activeRepo, analysis, analysisStatus } = useRepo();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingId]);

  useEffect(() => {
    // Clear thread when switching repositories.
    setMessages([]);
    setError(null);
    abortRef.current?.abort();
    setStreamingId(null);
  }, [activeRepo?.fullName]);

  const followUps = useMemo(() => {
    if (!messages.length) return SUGGESTIONS;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant || lastAssistant.unknown) {
      return [
        'What should I look at next in this repo?',
        'Summarize the auth-related files you found.',
        'List the main services and what they do.',
      ];
    }
    return [
      'Go deeper on that.',
      'Show me the relevant code paths.',
      'What else depends on those files?',
      'Are there risks if I change that?',
    ];
  }, [messages]);

  async function ask(question: string): Promise<void> {
    if (!activeRepo || streamingId) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    const assistantId = randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      citations: [],
    };

    const history: ChatHistoryTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreamingId(assistantId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of streamChat({
        repoFullName: activeRepo.fullName,
        question,
        history,
        signal: controller.signal,
      })) {
        if (event.type === 'meta') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, citations: event.citations } : m,
            ),
          );
        } else if (event.type === 'delta') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.text } : m,
            ),
          );
        } else if (event.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: event.answer || m.content,
                    unknown: event.unknown,
                  }
                : m,
            ),
          );
        } else if (event.type === 'error') {
          setError(event.message);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Chat failed');
      }
    } finally {
      setStreamingId(null);
      abortRef.current = null;
    }
  }

  if (!activeRepo) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Select a repository in the switcher to start chatting.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4 lg:h-[calc(100vh-6.5rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">AI Repository Chat</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {activeRepo.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Answers are grounded in README, folder structure, services, and knowledge base — not
            generic model memory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={analysisStatus === 'ready' ? 'success' : 'secondary'}>
            {analysisStatus === 'ready' ? 'Context ready' : analysisStatus}
          </Badge>
          {analysis && (
            <Badge variant="outline">{analysis.endpoints.length} APIs indexed</Badge>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/repository">View analysis</Link>
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background/40">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Ask anything about <span className="font-mono text-foreground">{activeRepo.fullName}</span>
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const priorUser =
              message.role === 'assistant'
                ? [...messages.slice(0, index)].reverse().find((m) => m.role === 'user')
                : undefined;

            return (
              <ChatBubble
                key={message.id}
                message={message}
                isStreaming={message.id === streamingId}
                sourceQuestion={priorUser?.content}
                repoFullName={activeRepo.fullName}
              />
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="border-t border-border bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {messages.length > 0 && !streamingId && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2 sm:px-6">
            <span className="self-center text-[11px] text-muted-foreground">Follow up</span>
            {followUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void ask(q)}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-border p-3 sm:p-4">
          <ChatInput
            loading={Boolean(streamingId)}
            disabled={!activeRepo}
            onSend={(q) => void ask(q)}
            placeholder={`Ask about ${activeRepo.fullName}…`}
          />
        </div>
      </div>
    </div>
  );
}
