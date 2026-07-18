/** Authenticated user, sourced from GitHub OAuth. */
export interface User {
  id: string;
  githubId: number;
  username: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  createdAt: string;
}
