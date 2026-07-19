import type { User } from '@devguardian/shared';
import { isMongoConnected } from '../../config/db.js';
import { UserModel, type UserDocument } from '../../models/User.js';
import { decryptSecret, encryptSecret } from '../../utils/crypto.js';
import { randomUUID } from 'node:crypto';

export type StoredUser = User & { accessTokenEnc: string };

// ponytail: memory user store when Mongo is down (ceil: process-local; upgrade: always Mongo)
const memory = new Map<string, StoredUser>();
const byGithubId = new Map<number, string>();

function toPublic(user: StoredUser): User {
  return {
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    selectedRepos: user.selectedRepos ?? [],
  };
}

function fromDoc(doc: UserDocument): StoredUser {
  return {
    id: String(doc._id),
    githubId: doc.githubId,
    username: doc.username,
    name: doc.name ?? null,
    email: doc.email ?? null,
    avatarUrl: doc.avatarUrl,
    accessTokenEnc: doc.accessTokenEnc,
    createdAt: doc.createdAt.toISOString(),
    selectedRepos: doc.selectedRepos ?? [],
  };
}

export async function upsertGithubUser(input: {
  githubId: number;
  username: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  accessToken: string;
}): Promise<User> {
  const accessTokenEnc = encryptSecret(input.accessToken);

  if (isMongoConnected()) {
    const doc = await UserModel.findOneAndUpdate(
      { githubId: input.githubId },
      {
        username: input.username,
        name: input.name,
        email: input.email,
        avatarUrl: input.avatarUrl,
        accessTokenEnc,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    if (!doc) throw new Error('Failed to upsert user');
    return toPublic(fromDoc(doc));
  }

  const existingId = byGithubId.get(input.githubId);
  const now = new Date().toISOString();
  if (existingId) {
    const prev = memory.get(existingId)!;
    const updated: StoredUser = {
      ...prev,
      username: input.username,
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl,
      accessTokenEnc,
    };
    memory.set(existingId, updated);
    return toPublic(updated);
  }

  const id = randomUUID();
  const created: StoredUser = {
    id,
    githubId: input.githubId,
    username: input.username,
    name: input.name,
    email: input.email,
    avatarUrl: input.avatarUrl,
    accessTokenEnc,
    createdAt: now,
    selectedRepos: [],
  };
  memory.set(id, created);
  byGithubId.set(input.githubId, id);
  return toPublic(created);
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  if (isMongoConnected()) {
    const doc = await UserModel.findById(id).exec();
    return doc ? fromDoc(doc) : null;
  }
  return memory.get(id) ?? null;
}

export async function setSelectedRepos(
  userId: string,
  fullNames: string[],
): Promise<User> {
  const normalized = [
    ...new Set(fullNames.map((n) => n.trim()).filter(Boolean)),
  ];

  if (isMongoConnected()) {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { selectedRepos: normalized },
      { new: true },
    ).exec();
    if (!doc) throw new Error('User not found');
    return toPublic(fromDoc(doc));
  }

  const prev = memory.get(userId);
  if (!prev) throw new Error('User not found');
  const updated: StoredUser = { ...prev, selectedRepos: normalized };
  memory.set(userId, updated);
  return toPublic(updated);
}

export function getAccessToken(user: StoredUser): string {
  return decryptSecret(user.accessTokenEnc);
}

export { toPublic };
