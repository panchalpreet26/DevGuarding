import type { User } from '@devguardian/shared';
import { isMongoConnected } from '../../config/db.js';
import { UserModel, type UserDocument } from '../../models/User.js';
import { decryptSecret, encryptSecret } from '../../utils/crypto.js';
import { HttpError } from '../../utils/http.js';

export type StoredUser = User & { accessTokenEnc: string | null };

function requireMongoForAuth(): void {
  if (!isMongoConnected()) {
    throw new HttpError(
      503,
      'mongo_required',
      'MongoDB is required for authentication. Start Mongo or set MONGODB_URI.',
    );
  }
}

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
    accessTokenEnc: doc.accessTokenEnc ?? null,
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
  requireMongoForAuth();
  const accessTokenEnc = encryptSecret(input.accessToken);

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

export async function findUserById(id: string): Promise<StoredUser | null> {
  requireMongoForAuth();
  const doc = await UserModel.findById(id).exec();
  return doc ? fromDoc(doc) : null;
}

export async function setSelectedRepos(userId: string, fullNames: string[]): Promise<User> {
  requireMongoForAuth();
  const normalized = [...new Set(fullNames.map((n) => n.trim()).filter(Boolean))];

  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { selectedRepos: normalized },
    { new: true },
  ).exec();
  if (!doc) throw new Error('User not found');
  return toPublic(fromDoc(doc));
}

export function getAccessToken(user: StoredUser): string | undefined {
  if (!user.accessTokenEnc) return undefined;
  return decryptSecret(user.accessTokenEnc);
}

/** Wipe stored GitHub token so the next API call forces re-auth. */
export async function clearAccessToken(userId: string): Promise<void> {
  if (!isMongoConnected()) return;
  await UserModel.findByIdAndUpdate(userId, { accessTokenEnc: null }).exec();
}

export async function recordLoginAudit(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  requireMongoForAuth();
  await UserModel.findByIdAndUpdate(userId, {
    lastLoginAt: new Date(),
    lastLoginIp: meta.ip ?? null,
    lastLoginUserAgent: meta.userAgent ?? null,
  }).exec();
}

export { toPublic };
