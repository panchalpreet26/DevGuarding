import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  disabled?: boolean;
  loading?: boolean;
  onSend: (question: string) => void;
  placeholder?: string;
}

export function ChatInput({
  disabled,
  loading,
  onSend,
  placeholder = 'Ask about this repository…',
}: ChatInputProps) {
  const [value, setValue] = useState('');

  function submit(): void {
    const q = value.trim();
    if (!q || disabled || loading) return;
    onSend(q);
    setValue('');
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-2 shadow-card focus-within:ring-1 focus-within:ring-ring"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={disabled || loading}
        placeholder={placeholder}
        className="max-h-40 min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <p className="text-[11px] text-muted-foreground">Enter to send · Shift+Enter for newline</p>
        <Button
          type="submit"
          size="icon"
          className="size-9 rounded-xl"
          disabled={disabled || loading || !value.trim()}
          aria-label="Send message"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
