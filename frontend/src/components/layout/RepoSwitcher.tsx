import { Check, ChevronsUpDown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardRepo } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface RepoSwitcherProps {
  repos: DashboardRepo[];
  activeRepoId: number;
  onSelect: (repoId: number) => void;
  className?: string;
}

export function RepoSwitcher({ repos, activeRepoId, onSelect, className }: RepoSwitcherProps) {
  const active = repos.find((repo) => repo.id === activeRepoId) ?? repos[0];

  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 max-w-[min(100%,18rem)] justify-between gap-2 border-border bg-card px-3 font-normal',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {active.private && <Lock className="size-3.5 shrink-0 text-muted-foreground" />}
            <span className="truncate font-mono text-sm">{active.fullName}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Switch repository</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {repos.map((repo) => (
          <DropdownMenuItem
            key={repo.id}
            onSelect={() => onSelect(repo.id)}
            className="justify-between"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-mono text-sm">{repo.fullName}</span>
              <span className="text-xs text-muted-foreground">
                {repo.language}
                {repo.private ? ' · Private' : ' · Public'}
              </span>
            </span>
            {repo.id === activeRepoId && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
