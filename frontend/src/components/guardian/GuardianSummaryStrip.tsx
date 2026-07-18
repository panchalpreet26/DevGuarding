import type { GuardianReportSummary } from '@devguardian/shared';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SummaryStripProps {
  summary: GuardianReportSummary;
}

const tiles: Array<{
  key: keyof Pick<GuardianReportSummary, 'critical' | 'high' | 'medium' | 'low'>;
  label: string;
  className: string;
}> = [
  { key: 'critical', label: 'Critical', className: 'text-destructive' },
  { key: 'high', label: 'High', className: 'text-destructive' },
  { key: 'medium', label: 'Medium', className: 'text-warning' },
  { key: 'low', label: 'Low', className: 'text-muted-foreground' },
];

export function GuardianSummaryStrip({ summary }: SummaryStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {tiles.map((tile) => (
        <Card key={tile.key}>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className={cn('mt-1 font-display text-2xl font-semibold tabular-nums', tile.className)}>
              {summary[tile.key]}
            </p>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Spec routes
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {summary.specEndpoints}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Code routes
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {summary.codeEndpoints}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Matched
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-success">
            {summary.matched}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
