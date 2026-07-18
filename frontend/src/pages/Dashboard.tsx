import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ApiHealthCard } from '@/components/dashboard/ApiHealthCard';
import { KnowledgeEntriesCard } from '@/components/dashboard/KnowledgeEntriesCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { RecentQuestions } from '@/components/dashboard/RecentQuestions';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRepo } from '@/context/RepoContext';
import { dashboardSnapshot } from '@/data/dashboard';
import type { StatMetric } from '@/types/dashboard';

function statsFromAnalysis(
  repoName: string,
  analysis: NonNullable<ReturnType<typeof useRepo>['analysis']>,
): StatMetric[] {
  return [
    {
      id: 'repo',
      label: 'Repository',
      value: repoName,
      hint: analysis.repoFullName,
      trend: { direction: 'flat', label: 'Analyzed' },
    },
    {
      id: 'stack',
      label: 'Framework',
      value: analysis.frameworks[0] ?? analysis.techStack[0] ?? '—',
      hint: analysis.frameworks.slice(1, 3).join(' · ') || 'From package.json',
    },
    {
      id: 'backend',
      label: 'Backend',
      value:
        analysis.frameworks.find((f) =>
          ['Express', 'NestJS', 'Fastify', 'Koa', 'Hono'].includes(f),
        ) ?? (analysis.endpoints.length ? 'HTTP API' : '—'),
      hint: `${analysis.endpoints.length} endpoints`,
    },
    {
      id: 'database',
      label: 'Database',
      value: analysis.database ?? '—',
      hint: analysis.database ? 'Detected dependency' : 'Not detected',
    },
    {
      id: 'ai',
      label: 'AI Status',
      value: 'Ready',
      hint: 'Repo context indexed',
      trend: { direction: 'up', label: `${analysis.techStack.length} stack signals` },
    },
    {
      id: 'api',
      label: 'API Health',
      value: analysis.endpoints.length ? 'Mapped' : '—',
      hint: 'See API Guardian later',
      trend: {
        direction: analysis.endpoints.length ? 'up' : 'flat',
        label: `${analysis.endpoints.length} routes`,
      },
    },
  ];
}

export default function Dashboard() {
  const { activeRepo, analysis, analysisStatus, analysisError, reposError } = useRepo();
  const { recentQuestions, knowledge, apiHealth, activity } = dashboardSnapshot;

  const stats =
    analysis && activeRepo
      ? statsFromAnalysis(activeRepo.name, analysis)
      : dashboardSnapshot.stats;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Engineering overview</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {activeRepo?.name ?? 'Select a repository'}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {analysisStatus === 'loading' && 'Analyzing repository structure and APIs…'}
            {analysisStatus === 'ready' && analysis && (
              <>
                {analysis.frameworks.join(' · ') || analysis.techStack.slice(0, 3).join(' · ') ||
                  'Stack detected'}
                {analysis.database ? ` · ${analysis.database}` : ''}. Context ready for grounded
                answers.
              </>
            )}
            {analysisStatus === 'error' && (analysisError ?? 'Analysis failed.')}
            {analysisStatus === 'idle' &&
              (reposError ?? 'Pick a repository from the switcher to run analysis.')}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/repository">View full analysis</Link>
        </Button>
      </section>

      {analysisStatus === 'loading' && (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Reading README, package.json, routes, controllers, services, middleware…
          </CardContent>
        </Card>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((metric) => (
          <StatCard key={metric.id} metric={metric} />
        ))}
      </section>

      {analysis && analysisStatus === 'ready' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Project summary
              </p>
              <p className="line-clamp-4 text-sm leading-relaxed text-foreground/90">
                {analysis.summary.replace(/\*\*/g, '').split(/\n\n/)[0]}
              </p>
              <Button variant="link" className="h-auto px-0" asChild>
                <Link to="/repository">Open repository analysis →</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <ApiHealthCard
          health={{
            ...apiHealth,
            endpointsChecked: analysis?.endpoints.length ?? apiHealth.endpointsChecked,
            status: analysis?.endpoints.length ? 'healthy' : apiHealth.status,
          }}
        />
        <KnowledgeEntriesCard knowledge={knowledge} />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentQuestions questions={recentQuestions} />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity
            items={
              analysis
                ? [
                    {
                      id: 'analysis-live',
                      kind: 'analysis' as const,
                      title: 'Repository analyzed',
                      detail: `${analysis.endpoints.length} endpoints · ${analysis.techStack.length} stack signals`,
                      at: 'Just now',
                    },
                    ...activity.slice(0, 4),
                  ]
                : activity
            }
          />
        </div>
      </section>
    </div>
  );
}
