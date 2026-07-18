import {
  BookOpen,
  FolderGit2,
  MessageSquare,
  ScanSearch,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityItem } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface RecentActivityProps {
  items: ActivityItem[];
}

const kindMeta: Record<
  ActivityItem['kind'],
  { icon: typeof MessageSquare; className: string }
> = {
  analysis: { icon: ScanSearch, className: 'bg-primary/15 text-primary' },
  chat: { icon: MessageSquare, className: 'bg-sky-500/15 text-sky-400' },
  knowledge: { icon: BookOpen, className: 'bg-emerald-500/15 text-emerald-400' },
  guardian: { icon: Shield, className: 'bg-amber-500/15 text-amber-400' },
  repo: { icon: FolderGit2, className: 'bg-violet-500/15 text-violet-400' },
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>What happened across analysis, chat, and guardian</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0">
          {items.map((item, index) => {
            const meta = kindMeta[item.kind];
            const Icon = meta.icon;
            const isLast = index === items.length - 1;

            return (
              <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-border" />
                )}
                <span
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg',
                    meta.className,
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <time className="text-[11px] text-muted-foreground">{item.at}</time>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
