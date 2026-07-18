import { Loader2, RefreshCw } from 'lucide-react';
import { ApiListCard } from '@/components/analysis/ApiListCard';
import {
  ArchitectureCard,
  AuthFlowCard,
  FolderStructureCard,
  ProjectSummaryCard,
  TechStackCard,
} from '@/components/analysis/AnalysisPanels';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRepo } from '@/context/RepoContext';

export default function RepositoryPage() {
  const {
    activeRepo,
    analysis,
    analysisStatus,
    analysisError,
    reanalyze,
    reposError,
  } = useRepo();

  if (reposError && !activeRepo) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Connect GitHub to analyze a repository</p>
          <p>
            Add a personal access token as <code className="font-mono text-xs">GITHUB_TOKEN</code> in
            the monorepo <code className="font-mono text-xs">.env</code>, restart the backend, then
            select a repository from the switcher.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Repository analysis</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {activeRepo?.fullName ?? 'No repository selected'}
          </h2>
          {activeRepo?.description && (
            <p className="max-w-2xl text-sm text-muted-foreground">{activeRepo.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void reanalyze()}
          disabled={!activeRepo || analysisStatus === 'loading'}
        >
          {analysisStatus === 'loading' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Re-analyze
        </Button>
      </div>

      {analysisStatus === 'loading' && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Reading README, package.json, folder tree, routes, controllers, services, and
            middleware…
          </CardContent>
        </Card>
      )}

      {analysisStatus === 'error' && (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{analysisError}</CardContent>
        </Card>
      )}

      {analysis && analysisStatus === 'ready' && (
        <>
          <ProjectSummaryCard analysis={analysis} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TechStackCard analysis={analysis} />
            <AuthFlowCard analysis={analysis} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FolderStructureCard analysis={analysis} />
            <ApiListCard endpoints={analysis.endpoints} />
          </div>

          <ArchitectureCard analysis={analysis} />

          <p className="text-xs text-muted-foreground">
            Analyzed at {new Date(analysis.analyzedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
