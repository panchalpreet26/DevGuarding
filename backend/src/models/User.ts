import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Authenticated DevGuardian user (GitHub OAuth).
 * Access token is stored encrypted; never returned to the client.
 */
const userSchema = new Schema(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true, trim: true },
    name: { type: String, default: null },
    email: { type: String, default: null },
    avatarUrl: { type: String, required: true },
    accessTokenEnc: { type: String, default: null },
    selectedRepos: { type: [String], default: [] },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    lastLoginUserAgent: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'users',
  },
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const UserModel = model('User', userSchema);
