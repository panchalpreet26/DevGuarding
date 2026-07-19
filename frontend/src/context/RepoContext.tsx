import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Repository, RepositoryAnalysis } from '@devguardian/shared';
import { ApiRequestError } from '@/services/api';
import { analyzeRepo, fetchRepos } from '@/services/analysis';

type AnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

interface RepoContextValue {
  repos: Repository[];
  reposLoading: boolean;
  reposError: string | null;
  activeRepo: Repository | null;
  selectRepo: (repoId: number) => void;
  analysis: RepositoryAnalysis | null;
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
  refreshRepos: () => Promise<void>;
  reanalyze: () => Promise<void>;
  analyzeFullName: (fullName: string) => Promise<void>;
}

const RepoContext = createContext<RepoContextValue | null>(null);

const STORAGE_KEY = 'devguardian.activeRepoId';

export function RepoProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);
  const [activeRepoId, setActiveRepoId] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  });
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const activeRepo = useMemo(
    () => repos.find((r) => r.id === activeRepoId) ?? repos[0] ?? null,
    [repos, activeRepoId],
  );

  const runAnalysis = useCallback(async (fullName: string, force = false) => {
    setAnalysisStatus('loading');
    setAnalysisError(null);
    try {
      const { analysis: result } = await analyzeRepo(fullName, force);
      setAnalysis(result);
      setAnalysisStatus('ready');
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to analyze repository.';
      setAnalysis(null);
      setAnalysisStatus('error');
      setAnalysisError(message);
    }
  }, []);

  const refreshRepos = useCallback(async () => {
    setReposLoading(true);
    setReposError(null);
    try {
      const list = await fetchRepos();
      setRepos(list);
      if (!list.length) {
        setReposError('No repositories connected yet. Choose public repos to continue.');
      }
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not load repositories. Sign in with GitHub again.';
      setRepos([]);
      setReposError(message);
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRepos();
  }, [refreshRepos]);

  useEffect(() => {
    if (!activeRepo) return;
    localStorage.setItem(STORAGE_KEY, String(activeRepo.id));
    void runAnalysis(activeRepo.fullName);
  }, [activeRepo, runAnalysis]);

  const selectRepo = useCallback((repoId: number) => {
    setActiveRepoId(repoId);
  }, []);

  const reanalyze = useCallback(async () => {
    if (!activeRepo) return;
    await runAnalysis(activeRepo.fullName, true);
  }, [activeRepo, runAnalysis]);

  const analyzeFullName = useCallback(
    async (fullName: string) => {
      await runAnalysis(fullName, true);
    },
    [runAnalysis],
  );

  const value: RepoContextValue = {
    repos,
    reposLoading,
    reposError,
    activeRepo,
    selectRepo,
    analysis,
    analysisStatus,
    analysisError,
    refreshRepos,
    reanalyze,
    analyzeFullName,
  };

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error('useRepo must be used within RepoProvider');
  return ctx;
}
