/** AI repository chat message and request/response shapes. */
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Files the AI used as grounding context for this answer. */
  citations?: string[];
  /** True when the AI could not answer from repo context. */
  unknown?: boolean;
}

export interface ChatHistoryTurn {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  repoFullName: string;
  question: string;
  /** Prior turns for follow-up questions. */
  history?: ChatHistoryTurn[];
}

export interface ChatResponse {
  answer: string;
  citations: string[];
  unknown: boolean;
}

/** SSE event payloads for streaming chat. */
export type ChatStreamEvent =
  | { type: 'meta'; citations: string[]; knowledgeHits: number }
  | { type: 'delta'; text: string }
  | { type: 'done'; unknown: boolean; answer: string }
  | { type: 'error'; message: string };
