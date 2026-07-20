import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { RepoSwitcher } from '@/components/layout/RepoSwitcher';
import { RepoProvider, useRepo } from '@/context/RepoContext';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

function ShellInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const {
    repos,
    activeRepo,
    selectRepo,
    reposLoading,
    reposError,
    analysisStatus,
  } = useRepo();

  const switcherRepos = repos.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    name: r.name,
    language: r.language ?? 'Unknown',
    private: r.private,
  }));

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* lg:ml-60 reserves space for the fixed sidebar (w-60) */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
        <TopNavbar
          user={{
            username: user?.username ?? 'user',
            name: user?.name ?? user?.username ?? 'User',
            avatarUrl: user?.avatarUrl ?? '',
          }}
          repos={switcherRepos}
          activeRepoId={activeRepo?.id ?? 0}
          onSelectRepo={selectRepo}
          onOpenSidebar={() => setSidebarOpen(true)}
          title={
            analysisStatus === 'loading'
              ? 'Analyzing…'
              : activeRepo?.name ?? 'Dashboard'
          }
        />

        <div className="border-b border-border px-4 py-3 sm:hidden">
          {switcherRepos.length > 0 && activeRepo && (
            <RepoSwitcher
              repos={switcherRepos}
              activeRepoId={activeRepo.id}
              onSelect={selectRepo}
              className="w-full"
            />
          )}
        </div>

        {(reposLoading || reposError) && (
          <div className="border-b border-border bg-card/40 px-4 py-2 text-sm text-muted-foreground sm:px-6">
            {reposLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Loading your GitHub repositories…
              </span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-2">
                <Badge variant="warning">Repos</Badge>
                {reposError}
              </span>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <RepoProvider>
      <ShellInner />
    </RepoProvider>
  );
}
