/** A GitHub repository the user can select for analysis. */
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  htmlUrl: string;
  updatedAt: string;
}
