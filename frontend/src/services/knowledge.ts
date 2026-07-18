import type { KnowledgeEntry } from '@devguardian/shared';
import { api } from '@/services/api';

export async function listKnowledgeEntries(repoFullName: string): Promise<{
  entries: KnowledgeEntry[];
  storage: 'mongodb' | 'memory';
}> {
  const q = encodeURIComponent(repoFullName);
  return api.get(`/knowledge?repoFullName=${q}`);
}

export async function createKnowledgeEntry(input: {
  repoFullName: string;
  question: string;
  answer: string;
  createdBy?: string;
}): Promise<KnowledgeEntry> {
  const data = await api.post<{ entry: KnowledgeEntry }>('/knowledge', input);
  return data.entry;
}

export async function updateKnowledgeEntry(
  id: string,
  patch: { question?: string; answer?: string },
): Promise<KnowledgeEntry> {
  const data = await api.put<{ entry: KnowledgeEntry }>(`/knowledge/${id}`, patch);
  return data.entry;
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  await api.del(`/knowledge/${id}`);
}
