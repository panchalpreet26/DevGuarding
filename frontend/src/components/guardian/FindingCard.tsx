import { CheckCircle2, FileCode2, Lightbulb, ShieldAlert } from 'lucide-react';
import type { GuardianFinding } from '@devguardian/shared';
import { Card, CardContent } from '@/components/ui/card';
import { KindBadge, SeverityBadge } from '@/components/guardian/SeverityBadge';
import { cn } from '@/lib/utils';

interface FindingCardProps {
  finding: GuardianFinding;
}

export function FindingCard({ finding }: FindingCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        finding.severity === 'critical' && 'border-destructive/40',
        finding.severity === 'high' && 'border-destructive/25',
        finding.severity === 'medium' && 'border-warning/30',
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <KindBadge kind={finding.kind} />
            </div>
            <h3 className="font-display text-sm font-semibold leading-snug">{finding.title}</h3>
          </div>
          {finding.endpoint && (
            <code className="rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {finding.endpoint}
            </code>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{finding.description}</p>

        <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
            <Lightbulb className="size-3.5" />
            Suggested fix
          </p>
          <p className="text-sm text-foreground/90">{finding.suggestedFix}</p>
        </div>

        {finding.affectedFiles.length > 0 ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <FileCode2 className="size-3.5" />
              Affected files
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {finding.affectedFiles.map((file) => (
                <li
                  key={file}
                  className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {file}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldAlert className="size-3.5" />
            No matching implementation file located
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyFindings() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="font-display text-base font-semibold">No mismatches found</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Spec endpoints and repository routes look aligned for the checks we ran.
        </p>
      </CardContent>
    </Card>
  );
}
