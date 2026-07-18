import type { KnowledgeEntry, RepositoryAnalysis } from '@devguardian/shared';
import {
  getFileContent,
  getFilesContent,
  getRepo,
  getRepoTree,
  parseFullName,
  type GitHubTreeItem,
} from '../github/client.js';
import { analyzeRepository, getCachedAnalysis } from '../analysis/index.js';
import { classifySourcePaths } from '../analysis/treeBuilder.js';
import { searchKnowledge } from '../knowledge/store.js';

const MAX_FILE_CHARS = 6_000;
const MAX_CONTEXT_CHARS = 28_000;
const MAX_FILES = 8;

export type ChatContext = {
  contextText: string;
  citations: string[];
  knowledgeHits: KnowledgeEntry[];
  /** High-confidence memory hit — prefer answering from this directly. */
  strongMatch: KnowledgeEntry | null;
  analysis: RepositoryAnalysis;
};

function tokenize(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9_/.-]+/)
    .filter(
      (t) =>
        t.length > 2 &&
        !['the', 'and', 'for', 'how', 'what', 'where', 'which', 'does'].includes(t),
    );
}

function scorePath(path: string, tokens: string[]): number {
  const lower = path.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 3;
  }
  if (/(^|\/)(services?|controllers?|routes?|middlewares?|models?|auth)(\/|$)/i.test(path)) {
    score += 2;
  }
  if (/readme/i.test(path)) score += 1;
  return score;
}

function scoreContent(content: string, tokens: string[]): number {
  const lower = content.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 1;
  }
  return score;
}

function flattenFolderPaths(analysis: RepositoryAnalysis, limit = 80): string[] {
  const paths: string[] = [];
  const walk = (node: { path: string; type: string; children?: unknown[] }) => {
    if (node.path) paths.push(node.path);
    for (const child of (node.children as typeof node[] | undefined) ?? []) walk(child);
  };
  walk(analysis.folderTree);
  return paths.slice(0, limit);
}

/**
 * Build grounded chat context.
 * Engineering Memory is searched FIRST and placed at the top of the prompt.
 */
export async function buildChatContext(
  repoFullName: string,
  question: string,
): Promise<ChatContext> {
  // 1) Search engineering memory first
  const { hits: knowledgeHits, strongMatch } = await searchKnowledge(repoFullName, question, 5);

  let analysis = getCachedAnalysis(repoFullName);
  if (!analysis) {
    analysis = await analyzeRepository(repoFullName);
  }

  const { owner, repo } = parseFullName(analysis.repoFullName);
  const meta = await getRepo(owner, repo);
  const tokens = tokenize(question);

  const { tree } = await getRepoTree(owner, repo, meta.defaultBranch);
  const blobPaths = tree.filter((t: GitHubTreeItem) => t.type === 'blob').map((t) => t.path);
  const classified = classifySourcePaths(blobPaths);

  const candidatePaths = [
    ...(classified.readme ? [classified.readme] : []),
    ...classified.services,
    ...classified.routes,
    ...classified.controllers,
    ...classified.middlewares,
    ...classified.models,
  ];

  const ranked = [...new Set(candidatePaths)]
    .map((path) => ({ path, score: scorePath(path, tokens) }))
    .sort((a, b) => b.score - a.score);

  const topPaths = ranked.slice(0, MAX_FILES).map((r) => r.path);
  const files = await getFilesContent(owner, repo, topPaths, meta.defaultBranch);

  const scoredFiles = [...files.entries()]
    .map(([path, content]) => ({
      path,
      content: content.slice(0, MAX_FILE_CHARS),
      score: scorePath(path, tokens) + scoreContent(content, tokens),
    }))
    .sort((a, b) => b.score - a.score);

  let readmeText: string | null = null;
  if (classified.readme) {
    readmeText =
      files.get(classified.readme) ??
      (await getFileContent(owner, repo, classified.readme, meta.defaultBranch));
  }

  const folderPaths = flattenFolderPaths(analysis);
  const sections: string[] = [];
  const citations: string[] = [];

  // Memory first — highest priority for the model
  if (knowledgeHits.length) {
    const kbBlock = knowledgeHits
      .map(
        (k) =>
          `Q: ${k.question}\nA: ${k.answer}\n(saved by ${k.createdBy} at ${k.createdAt})`,
      )
      .join('\n\n');
    sections.push(
      `# Engineering Memory (SEARCHED FIRST — prefer these human-verified answers)\n${kbBlock}`,
    );
    citations.push('engineering-memory');
  }

  sections.push(`# Repository\n${analysis.repoFullName}`);
  sections.push(`# Project summary\n${analysis.summary}`);
  sections.push(`# Tech stack\n${analysis.techStack.join(', ') || 'unknown'}`);
  sections.push(`# Auth flow\n${analysis.authFlow}`);

  if (analysis.endpoints.length) {
    sections.push(
      `# API endpoints\n${analysis.endpoints
        .slice(0, 40)
        .map((e) => `${e.method} ${e.path}${e.file ? ` (${e.file})` : ''}`)
        .join('\n')}`,
    );
  }

  sections.push(`# Folder structure (paths)\n${folderPaths.join('\n')}`);
  citations.push('folder-tree');

  if (readmeText) {
    sections.push(`# README\n${readmeText.slice(0, 5_000)}`);
    citations.push(classified.readme ?? 'README');
  }

  const serviceFiles = scoredFiles.filter((f) => /service/i.test(f.path)).slice(0, 4);
  const otherFiles = scoredFiles
    .filter((f) => !serviceFiles.some((s) => s.path === f.path))
    .slice(0, MAX_FILES - serviceFiles.length);

  for (const file of [...serviceFiles, ...otherFiles]) {
    sections.push(`# File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``);
    citations.push(file.path);
  }

  let contextText = sections.join('\n\n');
  if (contextText.length > MAX_CONTEXT_CHARS) {
    contextText = contextText.slice(0, MAX_CONTEXT_CHARS) + '\n\n[context truncated]';
  }

  return {
    contextText,
    citations: [...new Set(citations)],
    knowledgeHits,
    strongMatch,
    analysis,
  };
}
