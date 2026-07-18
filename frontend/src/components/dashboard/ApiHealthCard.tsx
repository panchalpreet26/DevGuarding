import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiHealthSummary } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface ApiHealthCardProps {
  health: ApiHealthSummary;
}

const statusConfig = {
  healthy: {
    label: 'Healthy',
    variant: 'success' as const,
    icon: CheckCircle2,
    bar: 'bg-success',
  },
  degraded: {
    label: 'Degraded',
    variant: 'warning' as const,
    icon: AlertTriangle,
    bar: 'bg-warning',
  },
  failing: {
    label: 'Failing',
    variant: 'destructive' as const,
    icon: AlertTriangle,
    bar: 'bg-destructive',
  },
};

export function ApiHealthCard({ health }: ApiHealthCardProps) {
  const config = statusConfig[health.status];
  const Icon = config.icon;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            API Health
          </CardTitle>
          <CardDescription>Last scanned {health.lastCheckedAt}</CardDescription>
        </div>
        <Badge variant={config.variant} className="gap-1">
          <Icon className="size-3" />
          {config.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-end justify-between">
            <span className="font-display text-3xl font-semibold tabular-nums">
              {health.coverage}%
            </span>
            <span className="text-xs text-muted-foreground">spec ↔ code coverage</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full transition-all', config.bar)}
              style={{ width: `${health.coverage}%` }}
            />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">Endpoints checked</dt>
            <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
              {health.endpointsChecked}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">Open findings</dt>
            <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
              {health.findings}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
