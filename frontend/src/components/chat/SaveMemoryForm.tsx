import { useState, type FormEvent } from 'react';
import { BookPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createKnowledgeEntry } from '@/services/knowledge';
import { ApiRequestError } from '@/services/api';

interface SaveMemoryFormProps {
  repoFullName: string;
  question: string;
  createdBy?: string;
  onSaved?: () => void;
}

export function SaveMemoryForm({
  repoFullName,
  question,
  createdBy = 'developer',
  onSaved,
}: SaveMemoryFormProps) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!answer.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createKnowledgeEntry({
        repoFullName,
        question,
        answer: answer.trim(),
        createdBy,
      });
      setSaved(true);
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save memory.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <p className="mt-2 text-xs text-success">
        Saved to engineering memory. Future answers will search this first.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 h-8 gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <BookPlus className="size-3.5" />
        Save explanation
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mt-3 space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3"
    >
      <p className="text-xs font-medium text-foreground">
        I don&apos;t know this yet — teach the team
      </p>
      <p className="line-clamp-2 text-[11px] text-muted-foreground">Q: {question}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder="Explain the tribal knowledge (why Redis, why this pattern, etc.)"
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        autoFocus
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !answer.trim()}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save to memory
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
