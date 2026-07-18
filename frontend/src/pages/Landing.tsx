import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Github, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiRequestError } from '@/services/api';

type Health = { status: string; service: string; env: string };

/** Public landing page. Also pings the backend so M1 wiring is visibly proven. */
export default function Landing() {
  const [health, setHealth] = useState<'checking' | 'up' | 'down'>('checking');

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
          <h1 className="text-4xl font-bold tracking-tight">DevGuardian AI</h1>
        </div>

        <p className="max-w-xl text-lg text-muted-foreground">
          The AI Engineering Brain for your codebase — understand any repo, preserve engineering
          knowledge, and catch breaking API changes before they ship.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" disabled>
            <Github className="size-4" />
            Continue with GitHub
            <span className="ml-1 text-xs opacity-70">(Milestone 2)</span>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/dashboard">
              Open dashboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
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
