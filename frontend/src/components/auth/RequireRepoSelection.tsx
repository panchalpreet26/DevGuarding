import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useRepo } from '@/context/RepoContext';

/** Forces first-time users to pick public repos before using the app. */
export function RequireRepoSelection() {
  const { repos, reposLoading } = useRepo();
  const location = useLocation();
  const onSelectPage = location.pathname === '/repos/select';

  if (reposLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading connected repositories…
      </div>
    );
  }

  if (!repos.length && !onSelectPage) {
    return <Navigate to="/repos/select" replace />;
  }

  return <Outlet />;
}
