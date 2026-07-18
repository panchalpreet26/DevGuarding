import { useState } from 'react';
import { Check, Copy, Bot, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import { SaveMemoryForm } from '@/components/chat/SaveMemoryForm';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@devguardian/shared';

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  /** Prior user question — used when saving engineering memory. */
  sourceQuestion?: string;
  repoFullName?: string;
}

export function ChatBubble({
  message,
  isStreaming,
  sourceQuestion,
  repoFullName,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  async function copyAll(): Promise<void> {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Bot className="size-4" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[min(100%,42rem)] rounded-2xl border px-4 py-3',
          isUser ? 'border-primary/30 bg-primary/10' : 'border-border bg-card',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <>
            {message.content ? (
              <MarkdownMessage content={message.content} />
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                Thinking…
              </span>
            )}
            {isStreaming && message.content && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary/80 align-middle" />
            )}
            {!isStreaming && message.content && (
              <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => void copyAll()}
                  >
                    {copied ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  {message.unknown && <Badge variant="warning">I don&apos;t know this yet</Badge>}
                  {message.citations?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {message.citations.slice(0, 6).map((c) => (
                        <Badge key={c} variant="outline" className="font-mono text-[10px]">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>

                {message.unknown && sourceQuestion && repoFullName && (
                  <SaveMemoryForm
                    repoFullName={repoFullName}
                    question={sourceQuestion}
                    createdBy="developer"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <User className="size-4" />
        </div>
      )}
    </div>
  );
}
