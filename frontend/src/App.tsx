import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import ChatPage from '@/pages/Chat';
import Dashboard from '@/pages/Dashboard';
import FeaturePage from '@/pages/FeaturePage';
import GuardianPage from '@/pages/Guardian';
import KnowledgePage from '@/pages/Knowledge';
import Landing from '@/pages/Landing';
import RepositoryPage from '@/pages/Repository';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/repository" element={<RepositoryPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/guardian" element={<GuardianPage />} />
        <Route
          path="/settings"
          element={
            <FeaturePage
              title="Settings"
              description="Manage account, connected repositories, and AI preferences."
            />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
