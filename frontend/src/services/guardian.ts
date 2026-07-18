import type { GuardianReport } from '@devguardian/shared';
import { api } from '@/services/api';

export async function compareSwagger(input: {
  repoFullName: string;
  swagger: unknown;
}): Promise<GuardianReport> {
  const data = await api.post<{ report: GuardianReport }>('/guardian/compare', input);
  return data.report;
}

export async function fetchGuardianReport(
  owner: string,
  repo: string,
): Promise<GuardianReport> {
  const data = await api.get<{ report: GuardianReport }>(`/guardian/${owner}/${repo}`);
  return data.report;
}
