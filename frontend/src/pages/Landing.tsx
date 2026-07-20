import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Github, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiRequestError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type Health = { status: string; service: string; env: string };

const AUTH_ERROR_COPY: Record<string, string> = {
  missing_code: 'GitHub did not return an authorization code. Try again.',
  invalid_state: 'Sign-in was interrupted (security check failed). Try again.',
  oauth_exchange_failed: 'Could not complete GitHub authorization. Try again.',
  oauth_not_configured: 'GitHub OAuth is not configured on the server.',
  mongo_required: 'Database is unavailable. Sign-in requires MongoDB.',
  oauth_failed: 'Sign-in failed. Try again.',
  rate_limited: 'Too many sign-in attempts. Wait a minute and try again.',
};

/** Public landing page with GitHub OAuth sign-in. */
export default function Landing() {
  const { user, loading: authLoading, loginWithGithub, oauthConfigured } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [health, setHealth] = useState<'checking' | 'up' | 'down'>('checking');
  const [authErrorText, setAuthErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const code = params.get('authError');
    const messageParam = params.get('authMessage');
    if (!code && !messageParam) return;

    let message = AUTH_ERROR_COPY[code ?? ''] ?? 'Sign-in failed. Try again.';
    if (messageParam) {
      try {
        message = decodeURIComponent(messageParam);
      } catch {
        message = messageParam;
      }
    }
    setAuthErrorText(message);

    const next = new URLSearchParams(params);
    next.delete('authError');
    next.delete('authMessage');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    api
      .get<Health>('/health')
      .then(() => setHealth('up'))
      .catch((err: ApiRequestError) => {
        console.error('Backend health check failed', err);
        setHealth('down');
      });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container flex min-h-screen flex-col items-center justify-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-10 text-primary" />
          <h1 className="font-display text-4xl font-bold tracking-tight">DevGuardian AI</h1>
        </div>

        <p className="max-w-xl text-lg text-muted-foreground">
          The AI Engineering Brain for your codebase — understand any repo, preserve engineering
          knowledge, and catch breaking API changes before they ship.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={loginWithGithub}
            disabled={authLoading || health === 'down'}
          >
            <Github className="size-4" />
            Continue with GitHub
          </Button>

          <p className="max-w-md text-xs text-muted-foreground">
            GitHub will ask for repository access (including private repos you choose to connect).
            DevGuardian only analyzes repositories you explicitly select.
          </p>

          {!oauthConfigured && health === 'up' && (
            <p className="max-w-md text-xs text-warning">
              Backend is up, but GitHub OAuth env vars are missing. Add{' '}
              <code className="font-mono">GITHUB_CLIENT_ID</code> and{' '}
              <code className="font-mono">GITHUB_CLIENT_SECRET</code> to{' '}
              <code className="font-mono">.env</code>, then restart the backend.
            </p>
          )}

          {authErrorText && (
            <p className="max-w-md text-sm text-destructive">{authErrorText}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {health === 'checking' && <Loader2 className="size-4 animate-spin" />}
          <span>
            Backend:{' '}
            <span
              className={
                health === 'up'
                  ? 'text-green-400'
                  : health === 'down'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              }
            >
              {health === 'checking' ? 'checking…' : health === 'up' ? 'connected' : 'unreachable'}
            </span>
          </span>
        </div>
      </div>
    </main>
  );
}
