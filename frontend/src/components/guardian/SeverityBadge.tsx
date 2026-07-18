import type { Severity } from '@devguardian/shared';
import { Badge } from '@/components/ui/badge';

const severityUi: Record<
  Severity,
  { label: string; variant: 'destructive' | 'warning' | 'secondary' | 'outline' }
> = {
  critical: { label: 'Critical', variant: 'destructive' },
  high: { label: 'High', variant: 'destructive' },
  medium: { label: 'Medium', variant: 'warning' },
  low: { label: 'Low', variant: 'secondary' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const ui = severityUi[severity];
  return <Badge variant={ui.variant}>{ui.label}</Badge>;
}

export function KindBadge({ kind }: { kind: string }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px]">
      {kind}
    </Badge>
  );
}
