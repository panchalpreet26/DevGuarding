import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useRepo } from '@/context/RepoContext';
import { ApiRequestError } from '@/services/api';
import { fetchAvailableRepos, saveRepoSelection } from '@/services/analysis';
import type { Repository } from '@devguardian/shared';
import { cn } from '@/lib/utils';

/**
 * Pick which public GitHub repos DevGuardian may analyze.
 * Private repos never appear here.
 */
export default function SelectReposPage() {
  const navigate = useNavigate();
  const { refresh: refreshAuth } = useAuth();
  const { refreshRepos } = useRepo();
  const [available, setAvailable] = useState<Repository[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAvailableRepos();
        if (cancelled) return;
        setAvailable(data.repos);
        setSelected(new Set(data.selectedRepos));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Could not load public repositories from GitHub.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(
    () => [...available].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [available],
  );

  function toggle(fullName: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await saveRepoSelection([...selected]);
      await refreshAuth();
      await refreshRepos();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to save repository selection.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <Badge variant="secondary">Connect repositories</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Choose public repos</h1>
        <p className="text-sm text-muted-foreground">
          Only repositories you select here are available for Analysis, Chat, Knowledge, and
          Guardian. Private repos are never listed.
        </p>
      </div>

      {loading ? (
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your public GitHub repositories…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No public repositories found on this GitHub account.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card/40">
          {sorted.map((repo) => {
            const checked = selected.has(repo.fullName);
            return (
              <li key={repo.id}>
                <button
                  type="button"
                  onClick={() => toggle(repo.fullName)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40',
                    checked && 'bg-muted/30',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded border',
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border',
                    )}
                  >
                    {checked ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm">{repo.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {repo.language ?? 'Unknown'} · Public
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button onClick={() => void onSave()} disabled={loading || saving || !!error}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            `Save ${selected.size} repo${selected.size === 1 ? '' : 's'}`
          )}
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/dashboard">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
