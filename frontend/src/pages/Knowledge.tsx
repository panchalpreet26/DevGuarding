import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookMarked, Loader2, Pencil, Trash2 } from 'lucide-react';
import type { KnowledgeEntry } from '@devguardian/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRepo } from '@/context/RepoContext';
import { ApiRequestError } from '@/services/api';
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  listKnowledgeEntries,
  updateKnowledgeEntry,
} from '@/services/knowledge';

export default function KnowledgePage() {
  const { activeRepo } = useRepo();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [storage, setStorage] = useState<'mongodb' | 'memory'>('memory');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeRepo) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listKnowledgeEntries(activeRepo.fullName);
      setEntries(data.entries);
      setStorage(data.storage);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load knowledge.');
    } finally {
      setLoading(false);
    }
  }, [activeRepo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!activeRepo || !question.trim() || !answer.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateKnowledgeEntry(editingId, {
          question: question.trim(),
          answer: answer.trim(),
        });
      } else {
        await createKnowledgeEntry({
          repoFullName: activeRepo.fullName,
          question: question.trim(),
          answer: answer.trim(),
          createdBy: 'developer',
        });
      }
      setQuestion('');
      setAnswer('');
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: KnowledgeEntry): void {
    setEditingId(entry.id);
    setQuestion(entry.question);
    setAnswer(entry.answer);
  }

  async function onDelete(id: string): Promise<void> {
    if (!confirm('Delete this memory entry?')) return;
    try {
      await deleteKnowledgeEntry(id);
      if (editingId === id) {
        setEditingId(null);
        setQuestion('');
        setAnswer('');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to delete.');
    }
  }

  if (!activeRepo) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select a repository to manage engineering memory.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Engineering Memory</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Knowledge Base</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            When the AI says it doesn&apos;t know something, save the explanation here. Future chat
            answers search this memory first.
          </p>
        </div>
        <Badge variant={storage === 'mongodb' ? 'success' : 'warning'}>
          {storage === 'mongodb' ? 'MongoDB' : 'In-memory fallback'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="size-4 text-primary" />
            {editingId ? 'Edit entry' : 'Add memory'}
          </CardTitle>
          <CardDescription>
            Stored for <span className="font-mono">{activeRepo.fullName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Question</label>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Why Redis?"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Redis was introduced to reduce OTP lookup latency."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !question.trim() || !answer.trim()}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingId ? 'Update' : 'Save'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setQuestion('');
                    setAnswer('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved entries</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : `${entries.length} memor${entries.length === 1 ? 'y' : 'ies'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">
              No memories yet. Save one from chat when the AI is unsure, or add above.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{entry.question}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.answer}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Created by {entry.createdBy} · {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => startEdit(entry)}
                      aria-label="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => void onDelete(entry.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
