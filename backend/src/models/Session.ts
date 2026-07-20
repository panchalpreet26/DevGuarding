import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Server-side session row. JWT carries `jti`; logout / revoke deletes (or expires) this row
 * so stolen cookies stop working immediately.
 */
const sessionSchema = new Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'sessions',
  },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDocument = HydratedDocument<InferSchemaType<typeof sessionSchema>>;

export const SessionModel = model('Session', sessionSchema);
