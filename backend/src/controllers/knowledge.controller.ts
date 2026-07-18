import type { Request, Response, NextFunction } from 'express';
import {
  createKnowledge,
  deleteKnowledge,
  getKnowledgeById,
  listKnowledge,
  searchKnowledge,
  updateKnowledge,
} from '../services/knowledge/store.js';
import { HttpError, sendOk } from '../utils/http.js';
import { parseFullName } from '../services/github/client.js';
import { isMongoConnected } from '../config/db.js';

/** GET /api/knowledge?repoFullName=owner/repo */
export async function listEntries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = String(req.query.repoFullName ?? '').trim();
    if (!repoFullName) {
      throw new HttpError(400, 'missing_repo', 'Query repoFullName is required.');
    }
    parseFullName(repoFullName);
    const entries = await listKnowledge(repoFullName);
    sendOk(res, { entries, storage: isMongoConnected() ? 'mongodb' : 'memory' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/knowledge/search?repoFullName=&q= */
export async function searchEntries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = String(req.query.repoFullName ?? '').trim();
    const q = String(req.query.q ?? '').trim();
    if (!repoFullName || !q) {
      throw new HttpError(400, 'missing_params', 'Query repoFullName and q are required.');
    }
    parseFullName(repoFullName);
    const { hits, strongMatch } = await searchKnowledge(repoFullName, q, 10);
    sendOk(res, { entries: hits, strongMatch });
  } catch (err) {
    next(err);
  }
}

/** GET /api/knowledge/:id */
export async function getEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id ?? '');
    const entry = await getKnowledgeById(id);
    if (!entry) throw new HttpError(404, 'knowledge_not_found', 'Knowledge entry not found.');
    sendOk(res, { entry });
  } catch (err) {
    next(err);
  }
}

/** POST /api/knowledge */
export async function createEntry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repoFullName = String(req.body?.repoFullName ?? '').trim();
    const question = String(req.body?.question ?? '').trim();
    const answer = String(req.body?.answer ?? '').trim();
    const createdBy = String(req.body?.createdBy ?? 'developer').trim();

    if (!repoFullName || !question || !answer) {
      throw new HttpError(
        400,
        'invalid_body',
        'Body must include repoFullName, question, and answer.',
      );
    }
    parseFullName(repoFullName);

    const entry = await createKnowledge({ repoFullName, question, answer, createdBy });
    sendOk(res, { entry }, 201);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/knowledge/:id */
export async function updateEntry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = String(req.params.id ?? '');
    const question =
      req.body?.question !== undefined ? String(req.body.question) : undefined;
    const answer = req.body?.answer !== undefined ? String(req.body.answer) : undefined;

    if (question === undefined && answer === undefined) {
      throw new HttpError(400, 'invalid_body', 'Provide question and/or answer to update.');
    }

    const entry = await updateKnowledge(id, { question, answer });
    sendOk(res, { entry });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/knowledge/:id */
export async function removeEntry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = String(req.params.id ?? '');
    await deleteKnowledge(id);
    sendOk(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
