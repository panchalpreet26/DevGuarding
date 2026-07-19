import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireRepoSelection } from '@/components/auth/RequireRepoSelection';
import { AppShell } from '@/layouts/AppShell';
import ChatPage from '@/pages/Chat';
import Dashboard from '@/pages/Dashboard';
import GuardianPage from '@/pages/Guardian';
import KnowledgePage from '@/pages/Knowledge';
import Landing from '@/pages/Landing';
import RepositoryPage from '@/pages/Repository';
import SelectReposPage from '@/pages/SelectRepos';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/repos/select" element={<SelectReposPage />} />
          <Route element={<RequireRepoSelection />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/repository" element={<RepositoryPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/guardian" element={<GuardianPage />} />
            <Route path="/settings" element={<SelectReposPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
