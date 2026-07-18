import type {
  CreateKnowledgeEntry,
  KnowledgeEntry,
  UpdateKnowledgeEntry,
} from '@devguardian/shared';
import { KnowledgeEntryModel, type KnowledgeEntryDocument } from '../../models/KnowledgeEntry.js';
import { isMongoConnected } from '../../config/db.js';
import { HttpError } from '../../utils/http.js';
import { randomUUID } from 'node:crypto';

// ponytail: memory mirror when Mongo is down (ceil: process-local; upgrade: always Mongo)
const memory = new Map<string, KnowledgeEntry>();

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_/.-]+/)
    .filter((t) => t.length > 2);
}

function scoreEntry(entry: KnowledgeEntry, queryTokens: string[], question: string): number {
  const q = question.trim().toLowerCase();
  const entryQ = entry.question.toLowerCase();
  if (entryQ === q) return 1000;
  if (entryQ.includes(q) || q.includes(entryQ)) return 500;

  const hay = `${entry.question} ${entry.answer}`.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (entryQ.includes(token)) score += 4;
    else if (hay.includes(token)) score += 1;
  }
  return score;
}

function toDto(doc: KnowledgeEntryDocument): KnowledgeEntry {
  return {
    id: String(doc._id),
    repoFullName: doc.repoFullName,
    question: doc.question,
    answer: doc.answer,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listKnowledge(repoFullName: string): Promise<KnowledgeEntry[]> {
  const key = repoFullName.toLowerCase();

  if (isMongoConnected()) {
    const docs = await KnowledgeEntryModel.find({ repoFullName: new RegExp(`^${escapeRegex(key)}$`, 'i') })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // lean docs need manual map when using lean - actually with lean timestamps are Date
    return docs.map((d) => ({
      id: String(d._id),
      repoFullName: d.repoFullName,
      question: d.question,
      answer: d.answer,
      createdBy: d.createdBy,
      createdAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
    }));
  }

  return [...memory.values()]
    .filter((e) => e.repoFullName.toLowerCase() === key)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getKnowledgeById(id: string): Promise<KnowledgeEntry | null> {
  if (isMongoConnected()) {
    const doc = await KnowledgeEntryModel.findById(id).exec();
    return doc ? toDto(doc) : null;
  }
  return memory.get(id) ?? null;
}

/**
 * Search engineering memory for a repo. Call this BEFORE repo code context.
 * Returns ranked hits; `strongMatch` when the top hit is an exact/near question match.
 */
export async function searchKnowledge(
  repoFullName: string,
  question: string,
  limit = 5,
): Promise<{ hits: KnowledgeEntry[]; strongMatch: KnowledgeEntry | null }> {
  const all = await listKnowledge(repoFullName);
  const queryTokens = tokenize(question);
  const ranked = all
    .map((entry) => ({ entry, score: scoreEntry(entry, queryTokens, question) }))
    .sort((a, b) => b.score - a.score);

  const hits = ranked.filter((r) => r.score > 0).slice(0, limit).map((r) => r.entry);
  const top = ranked[0];
  const strongMatch = top && top.score >= 500 ? top.entry : null;

  if (hits.length > 0) return { hits, strongMatch };
  return {
    hits: ranked.slice(0, Math.min(2, limit)).map((r) => r.entry),
    strongMatch: null,
  };
}

export async function createKnowledge(input: CreateKnowledgeEntry): Promise<KnowledgeEntry> {
  const question = input.question.trim();
  const answer = input.answer.trim();
  const repoFullName = input.repoFullName.trim();
  const createdBy = (input.createdBy ?? 'developer').trim() || 'developer';

  if (!question || !answer || !repoFullName) {
    throw new HttpError(400, 'invalid_knowledge', 'question, answer, and repoFullName are required.');
  }

  if (isMongoConnected()) {
    const doc = await KnowledgeEntryModel.create({
      question,
      answer,
      repoFullName,
      createdBy,
    });
    return toDto(doc);
  }

  const now = new Date().toISOString();
  const entry: KnowledgeEntry = {
    id: randomUUID(),
    repoFullName,
    question,
    answer,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  memory.set(entry.id, entry);
  return entry;
}

export async function updateKnowledge(
  id: string,
  patch: UpdateKnowledgeEntry,
): Promise<KnowledgeEntry> {
  if (isMongoConnected()) {
    const doc = await KnowledgeEntryModel.findById(id).exec();
    if (!doc) throw new HttpError(404, 'knowledge_not_found', 'Knowledge entry not found.');
    if (patch.question !== undefined) doc.question = patch.question.trim();
    if (patch.answer !== undefined) doc.answer = patch.answer.trim();
    await doc.save();
    return toDto(doc);
  }

  const existing = memory.get(id);
  if (!existing) throw new HttpError(404, 'knowledge_not_found', 'Knowledge entry not found.');
  const updated: KnowledgeEntry = {
    ...existing,
    question: patch.question?.trim() ?? existing.question,
    answer: patch.answer?.trim() ?? existing.answer,
    updatedAt: new Date().toISOString(),
  };
  memory.set(id, updated);
  return updated;
}

export async function deleteKnowledge(id: string): Promise<void> {
  if (isMongoConnected()) {
    const result = await KnowledgeEntryModel.findByIdAndDelete(id).exec();
    if (!result) throw new HttpError(404, 'knowledge_not_found', 'Knowledge entry not found.');
    return;
  }
  if (!memory.delete(id)) {
    throw new HttpError(404, 'knowledge_not_found', 'Knowledge entry not found.');
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
