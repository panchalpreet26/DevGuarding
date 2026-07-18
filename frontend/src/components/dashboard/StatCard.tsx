import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { StatMetric } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface StatCardProps {
  metric: StatMetric;
}

export function StatCard({ metric }: StatCardProps) {
  return (
    <Card className="transition-colors hover:border-border/80">
      <CardContent className="space-y-3 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {metric.label}
        </p>
        <p className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          {metric.value}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{metric.hint}</p>
          {metric.trend && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 text-[11px]',
                metric.trend.direction === 'up' && 'text-success',
                metric.trend.direction === 'down' && 'text-destructive',
                metric.trend.direction === 'flat' && 'text-muted-foreground',
              )}
            >
              {metric.trend.direction === 'up' && <ArrowUpRight className="size-3" />}
              {metric.trend.direction === 'down' && <ArrowDownRight className="size-3" />}
              {metric.trend.direction === 'flat' && <ArrowRight className="size-3" />}
              {metric.trend.label}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
