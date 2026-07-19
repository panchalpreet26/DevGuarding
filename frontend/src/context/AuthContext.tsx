import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@devguardian/shared';
import { api, ApiRequestError } from '@/services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  oauthConfigured: boolean;
  refresh: () => Promise<void>;
  loginWithGithub: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [me, status] = await Promise.all([
        api.get<{ user: User | null }>('/auth/me'),
        api.get<{ configured: boolean }>('/auth/status').catch(() => ({ configured: false })),
      ]);
      setUser(me.user);
      setOauthConfigured(status.configured);
    } catch (err) {
      if (!(err instanceof ApiRequestError && err.status === 401)) {
        console.error('Auth refresh failed', err);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginWithGithub = useCallback(() => {
    window.location.href = `${API_BASE}/auth/github`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, oauthConfigured, refresh, loginWithGithub, logout }),
    [user, loading, oauthConfigured, refresh, loginWithGithub, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
