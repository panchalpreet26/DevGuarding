import type { DashboardSnapshot } from '@/types/dashboard';

/**
 * Seed snapshot used until auth + analysis APIs land.
 * Content is domain-real (DevGuardian), not lorem placeholders.
 */
export const dashboardSnapshot: DashboardSnapshot = {
  user: {
    username: 'preneel',
    name: 'Preneel',
    avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
  },
  repos: [
    {
      id: 1,
      fullName: 'preneel/devguardian-ai',
      name: 'devguardian-ai',
      language: 'TypeScript',
      private: false,
    },
    {
      id: 2,
      fullName: 'preneel/payments-gateway',
      name: 'payments-gateway',
      language: 'Go',
      private: true,
    },
    {
      id: 3,
      fullName: 'acme/checkout-api',
      name: 'checkout-api',
      language: 'TypeScript',
      private: true,
    },
  ],
  activeRepoId: 1,
  repoMeta: {
    framework: 'React + Vite',
    backend: 'Express',
    database: 'MongoDB',
    aiStatus: 'ready',
  },
  stats: [
    {
      id: 'repo',
      label: 'Repository',
      value: 'devguardian-ai',
      hint: 'TypeScript · main',
      trend: { direction: 'flat', label: 'Synced 2m ago' },
    },
    {
      id: 'stack',
      label: 'Framework',
      value: 'React + Vite',
      hint: 'Frontend stack detected',
    },
    {
      id: 'backend',
      label: 'Backend',
      value: 'Express',
      hint: 'Node 20 · REST',
    },
    {
      id: 'database',
      label: 'Database',
      value: 'MongoDB',
      hint: 'Atlas-ready',
    },
    {
      id: 'ai',
      label: 'AI Status',
      value: 'Ready',
      hint: 'Context indexed',
      trend: { direction: 'up', label: '142 files' },
    },
    {
      id: 'api',
      label: 'API Health',
      value: '98%',
      hint: '1 medium finding',
      trend: { direction: 'up', label: '+2% week' },
    },
  ],
  recentQuestions: [
    {
      id: 'q1',
      question: 'Where is GitHub OAuth token storage handled?',
      answered: true,
      citations: 3,
      askedAt: '12 min ago',
    },
    {
      id: 'q2',
      question: 'Which services call the OpenAI Responses API?',
      answered: true,
      citations: 2,
      askedAt: '41 min ago',
    },
    {
      id: 'q3',
      question: 'What breaks if I rename the User model fields?',
      answered: false,
      citations: 0,
      askedAt: '1h ago',
    },
    {
      id: 'q4',
      question: 'Explain the repository analysis pipeline.',
      answered: true,
      citations: 5,
      askedAt: '3h ago',
    },
  ],
  knowledge: {
    total: 14,
    recent: [
      {
        id: 'k1',
        question: 'Why Redis for OTP lookups?',
        author: 'preneel',
        updatedAt: 'Yesterday',
      },
      {
        id: 'k2',
        question: 'Why encrypt GitHub tokens at rest?',
        author: 'preneel',
        updatedAt: '2 days ago',
      },
      {
        id: 'k3',
        question: 'Why npm workspaces instead of Turborepo?',
        author: 'preneel',
        updatedAt: '4 days ago',
      },
    ],
  },
  apiHealth: {
    status: 'healthy',
    endpointsChecked: 24,
    findings: 1,
    lastCheckedAt: '8 min ago',
    coverage: 98,
  },
  activity: [
    {
      id: 'a1',
      kind: 'analysis',
      title: 'Repository re-indexed',
      detail: '142 files · 24 routes · OpenAPI present',
      at: '2 min ago',
    },
    {
      id: 'a2',
      kind: 'chat',
      title: 'Asked about OAuth token storage',
      detail: 'Answered with 3 citations',
      at: '12 min ago',
    },
    {
      id: 'a3',
      kind: 'guardian',
      title: 'API Guardian scan finished',
      detail: '1 medium finding · missing field on /users',
      at: '28 min ago',
    },
    {
      id: 'a4',
      kind: 'knowledge',
      title: 'Saved engineering memory',
      detail: '“Why Redis for OTP lookups?”',
      at: 'Yesterday',
    },
    {
      id: 'a5',
      kind: 'repo',
      title: 'Connected repository',
      detail: 'preneel/devguardian-ai',
      at: '2 days ago',
    },
  ],
};
