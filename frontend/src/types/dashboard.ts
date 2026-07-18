export type ApiHealthStatus = 'healthy' | 'degraded' | 'failing';

export interface DashboardUser {
  username: string;
  name: string;
  avatarUrl: string;
}

export interface DashboardRepo {
  id: number;
  fullName: string;
  name: string;
  language: string;
  private: boolean;
}

export interface StatMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
}

export interface RecentQuestion {
  id: string;
  question: string;
  answered: boolean;
  citations: number;
  askedAt: string;
}

export interface KnowledgeSummary {
  total: number;
  recent: Array<{
    id: string;
    question: string;
    author: string;
    updatedAt: string;
  }>;
}

export interface ApiHealthSummary {
  status: ApiHealthStatus;
  endpointsChecked: number;
  findings: number;
  lastCheckedAt: string;
  coverage: number;
}

export interface ActivityItem {
  id: string;
  kind: 'analysis' | 'chat' | 'knowledge' | 'guardian' | 'repo';
  title: string;
  detail: string;
  at: string;
}

export interface DashboardSnapshot {
  user: DashboardUser;
  repos: DashboardRepo[];
  activeRepoId: number;
  repoMeta: {
    framework: string;
    backend: string;
    database: string;
    aiStatus: 'ready' | 'indexing' | 'idle';
  };
  stats: StatMetric[];
  recentQuestions: RecentQuestion[];
  knowledge: KnowledgeSummary;
  apiHealth: ApiHealthSummary;
  activity: ActivityItem[];
}
