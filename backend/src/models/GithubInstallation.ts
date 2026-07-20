import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * GitHub App installation for an org or user account.
 * Enables shared server-side repo access without every teammate re-granting scopes.
 */
const githubInstallationSchema = new Schema(
  {
    installationId: { type: Number, required: true, unique: true, index: true },
    accountLogin: { type: String, required: true, trim: true, index: true },
    accountId: { type: Number, required: true },
    accountType: { type: String, enum: ['Organization', 'User'], required: true },
    installedByUserId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    collection: 'github_installations',
  },
);

export type GithubInstallationDocument = HydratedDocument<
  InferSchemaType<typeof githubInstallationSchema>
>;

export const GithubInstallationModel = model('GithubInstallation', githubInstallationSchema);
