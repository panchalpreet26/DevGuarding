import type { Repository, RepositoryAnalysis } from '@devguardian/shared';
import { api } from '@/services/api';

export async function fetchRepos(): Promise<Repository[]> {
  const data = await api.get<{ repos: Repository[] }>('/repos');
  return data.repos;
}

export async function analyzeRepo(
  fullName: string,
  force = false,
): Promise<{ analysis: RepositoryAnalysis; cached: boolean }> {
  return api.post<{ analysis: RepositoryAnalysis; cached: boolean }>('/analysis', {
    fullName,
    force,
  });
}

export async function fetchCachedAnalysis(
  owner: string,
  repo: string,
): Promise<RepositoryAnalysis> {
  const data = await api.get<{ analysis: RepositoryAnalysis }>(`/analysis/${owner}/${repo}`);
  return data.analysis;
}
