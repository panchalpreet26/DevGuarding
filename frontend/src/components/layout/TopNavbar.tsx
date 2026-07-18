import { RepoSwitcher } from '@/components/layout/RepoSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { MobileMenuButton } from '@/components/layout/Sidebar';
import type { DashboardRepo, DashboardUser } from '@/types/dashboard';

interface TopNavbarProps {
  user: DashboardUser;
  repos: DashboardRepo[];
  activeRepoId: number;
  onSelectRepo: (repoId: number) => void;
  onOpenSidebar: () => void;
  title?: string;
}

export function TopNavbar({
  user,
  repos,
  activeRepoId,
  onSelectRepo,
  onOpenSidebar,
  title = 'Dashboard',
}: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <MobileMenuButton onClick={onOpenSidebar} />

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-sm font-semibold sm:text-base">{title}</h1>
      </div>

      <RepoSwitcher
        repos={repos}
        activeRepoId={activeRepoId}
        onSelect={onSelectRepo}
        className="hidden sm:inline-flex"
      />

      <UserMenu user={user} />
    </header>
  );
}
