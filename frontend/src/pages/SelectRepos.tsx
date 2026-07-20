import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useRepo } from '@/context/RepoContext';
import { ApiRequestError, api } from '@/services/api';
import { fetchAvailableRepos, saveRepoSelection } from '@/services/analysis';
import type { Repository } from '@devguardian/shared';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/**
 * Pick which GitHub repos (public or private) DevGuardian may analyze.
 */
export default function SelectReposPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refresh: refreshAuth, oauthConfigured } = useAuth();
  const { refreshRepos } = useRepo();
  const [available, setAvailable] = useState<Repository[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubAppConfigured, setGithubAppConfigured] = useState(false);
  const installedAccount = params.get('installed');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, status] = await Promise.all([
          fetchAvailableRepos(),
          api.get<{ configured: boolean; githubAppConfigured?: boolean }>('/auth/status'),
        ]);
        if (cancelled) return;
        setAvailable(data.repos);
        setSelected(new Set(data.selectedRepos));
        setGithubAppConfigured(Boolean(status.githubAppConfigured));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Could not load repositories from GitHub.',
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
        <h1 className="text-2xl font-semibold tracking-tight">Choose repositories</h1>
        <p className="text-sm text-muted-foreground">
          Select public or private repos you can access. Only what you pick here is available for
          Analysis, Chat, Knowledge, and Guardian.
        </p>
        {installedAccount && (
          <p className="text-sm text-green-500">
            GitHub App installed for <span className="font-mono">{installedAccount}</span>. Org
            repos from that install appear below.
          </p>
        )}
        {githubAppConfigured && oauthConfigured && (
          <p className="text-xs text-muted-foreground">
            Org admin?{' '}
            <a
              className="underline underline-offset-2"
              href={`${API_BASE}/auth/github/app/install`}
            >
              Install the GitHub App
            </a>{' '}
            so the team can connect org repos without each member re-authorizing.
          </p>
        )}
      </div>

      {loading ? (
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your GitHub repositories…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No repositories found. Re-authorize GitHub (repo scope) or install the GitHub App on your
          org.
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
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {repo.language ?? 'Unknown'} · {repo.private ? 'Private' : 'Public'}
                      {repo.private ? <Lock className="size-3" /> : null}
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
