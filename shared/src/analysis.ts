/** Result of analysing a repository's structure and code. */
export interface FolderNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FolderNode[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  handler?: string;
  file?: string;
}

export interface RepositoryAnalysis {
  repoFullName: string;
  summary: string;
  techStack: string[];
  frameworks: string[];
  database: string | null;
  folderTree: FolderNode;
  endpoints: ApiEndpoint[];
  authFlow: string;
  architectureDiagram: string;
  analyzedAt: string;
}
