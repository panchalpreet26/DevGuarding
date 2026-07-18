/** Engineering Memory: human-captured knowledge the AI didn't know. */
export interface KnowledgeEntry {
  id: string;
  repoFullName: string;
  question: string;
  answer: string;
  /** Developer who saved the explanation. */
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeEntry {
  repoFullName: string;
  question: string;
  answer: string;
  createdBy?: string;
}

export interface UpdateKnowledgeEntry {
  question?: string;
  answer?: string;
}
